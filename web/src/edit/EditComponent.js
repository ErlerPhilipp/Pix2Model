import React, { Component } from 'react'
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import Attribute from "./AttributeComponent";
import { Loader } from './Loader.js';
import { withTranslation } from 'react-i18next';
import { CSG } from 'three-csg-ts';

import './EditComponent.css';

class Edit extends Component {
  constructor(props) {
    super(props);
    this.scene = new THREE.Scene();
    this.state = {crop: false, loaded: false, name: '', rotation: {x: 0, y: 0, z: 0}, translation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}};
  }

  componentDidMount() {
    var camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 300) / (window.innerHeight - 75), 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 75);
    this.scene.background = new THREE.Color(0xfbebc3);
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);
    this.mount.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper( 10, 50 );
    this.scene.add( gridHelper );

    var labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth - 300, window.innerHeight - 75);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    this.mount.appendChild(labelRenderer.domElement);

    camera.position.z = 5;
    const controls = new OrbitControls(camera, labelRenderer.domElement);
    this.transformControls = new TransformControls(camera, labelRenderer.domElement);
    this.loader = new Loader(this);
    var scope = this;
    this.transformControls.addEventListener('mouseDown', function () {
      controls.enabled = false;
    });
    this.transformControls.addEventListener('mouseUp', function () {
      controls.enabled = true;
    });
    // transformcontrols
    this._handleUpdate = this.handleUpdate.bind(this)
    this.transformControls.addEventListener('change', this._handleUpdate);
    this.scene.add(this.transformControls);
    window.addEventListener('keydown', function (event) {
      switch (event.key) {
        case "q":
          scope.transformControls.setMode("translate")
          break
        case "r":
          scope.transformControls.setMode("rotate")
          break
        case "s":
          scope.transformControls.setMode("scale")
          break
      }
    })
    window.addEventListener('resize', function() {
      camera.aspect = (window.innerWidth - 300) / (window.innerHeight - 75);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth - 300, window.innerHeight - 75);
    })
    // animation
    var animate = function () {
      requestAnimationFrame(animate);
      renderer.render(scope.scene, camera);
      labelRenderer.render( scope.scene, camera );
      controls.update();
    };
    animate();
    // loader
    document.addEventListener('dragover', function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }, false);
    document.addEventListener('drop', function (event) {
      event.preventDefault();
      if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
      if (event.dataTransfer.items) {
        scope.loader.loadItemList(event.dataTransfer.items);
      } else {
        scope.loader.loadFiles(event.dataTransfer.files);
      }
    }, false);
    this.buildFileSelector();
    this.createCropBox();
    this.createLabels();
    this.box3 = new THREE.Box3();
    this.size = new THREE.Vector3();
  }

  buildFileSelector(){
    this.fileSelector = document.createElement('input');
    this.fileSelector.setAttribute('type', 'file');
    this.handleUpload_ = this.handleUpload.bind(this);
    this.fileSelector.addEventListener('change', this.handleUpload_, false);
  }

  handleFileSelect = (e) => {
    e.preventDefault();
    this.fileSelector.click();
  }

  handleUpload = (event) => {
    this.loader.loadFiles(this.fileSelector.files);
  }

  addObject(object, filename) {
    if (object.type == 'Group') {
      this.object = object.children[0];
    } else {
      this.object = object;
    }
    this.scene.add(this.object);
    this.transformControls.attach(this.object);
    this.setState({loaded: true, name: filename});
  }

  createCropBox() {
    var geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true
    });
    this.cropBox = new THREE.Mesh( geometry, material );
  }

  handleUpdate() {
    if (!this.object) {
      return;
    }
    var rotation = {x: this.object.rotation.x * 180 / Math.PI, y: this.object.rotation.y * 180 / Math.PI, z: this.object.rotation.z * 180 / Math.PI};
    var scale = {x: this.object.scale.x, y: this.object.scale.y, z: this.object.scale.z};
    var translation = {x: this.object.position.x, y: this.object.position.y, z: this.object.position.z};
    this.setState({rotation, scale, translation});
    if (this.boxHelper) {
      this.boxHelper.update();
      this.updateLabels();
    }
  }

  handleDownload() {
    var exporter = new PLYExporter();
    var link = document.createElement( 'a' );
    if ( link.href ) {
      URL.revokeObjectURL( link.href );
    }
    link.href = URL.createObjectURL( new Blob( [ exporter.parse( this.object ) ], { type: 'text/plain' } ) );
    link.download = "model.ply";
    link.dispatchEvent( new MouseEvent( 'click' ) );
  }

  cropObject() {
    if (!this.object) {
      return;
    }
   
    this.cropBox.updateMatrix();
    this.object.updateMatrix();
    if (!this.object.geometry.attributes.normal) {
      const normals = new Array(this.object.geometry.attributes.position.len).fill([0, 0, 0]);
      this.object.geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), 3)
      );
    }
    const bspObject = CSG.fromMesh(this.object);
    const bspBox = CSG.fromMesh(this.cropBox);                        
    const bspResult = bspBox.inverse().intersect(bspObject.inverse());
    const croppedObject = CSG.toMesh(bspResult, this.object.matrix);
    croppedObject.material = this.object.material;
    this.scene.add(croppedObject);
    this.scene.remove(this.object);
    this.object = croppedObject;
  }

  cropObjectInverse() {
    if (!this.object) {
      return;
    }
   
    this.cropBox.updateMatrix();
    this.object.updateMatrix();
    if (!this.object.geometry.attributes.normal) {
      const normals = new Array(this.object.geometry.attributes.position.len).fill([0, 0, 0]);
      this.object.geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), 3)
      );
    }
    const bspObject = CSG.fromMesh(this.object);
    const bspBox = CSG.fromMesh(this.cropBox);                        
    const bspResult = bspBox.intersect(bspObject.inverse());
    const croppedObject = CSG.toMesh(bspResult, this.object.matrix);
    croppedObject.material = this.object.material;
    this.scene.add(croppedObject);
    this.scene.remove(this.object);
    this.object = croppedObject;
  }

  updateValue(attribute, value) {
    const { t } = this.props;

    if (attribute === t('edit.scale') + 'X') {
      this.object.scale.x = parseFloat(value)
    } else if (attribute === t('edit.scale') + 'Y') {
      this.object.scale.y = parseFloat(value)
    } else if (attribute === t('edit.scale') + 'Z') {
      this.object.scale.z = parseFloat(value)
    } else if (attribute === 'TranslationX') {
      this.object.position.x = parseFloat(value)
    } else if (attribute === 'TranslationY') {
      this.object.position.y = parseFloat(value)
    } else if (attribute === 'TranslationZ') {
      this.object.position.z = parseFloat(value)
    } else if (attribute === 'RotationX') {
      this.object.rotation.x = parseFloat(value) * Math.PI / 180
    } else if (attribute === 'RotationY') {
      this.object.rotation.y = parseFloat(value) * Math.PI / 180
    } else if (attribute === 'RotationZ') {
      this.object.rotation.z = parseFloat(value) * Math.PI / 180
    }
    this.handleUpdate();
  }

  handleRemove() {
    this.transformControls.detach(this.object);
    this.scene.remove(this.object);
    this.scene.remove(this.cropBox);
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
    }
    this.setState({loaded: false, name: ''});
  }

  activateCrop(crop) {
    this.setState({crop: crop});
    if (crop) {
      this.scene.add(this.cropBox);
      this.transformControls.detach(this.object);
      this.transformControls.attach(this.cropBox);
    } else {
      this.transformControls.detach(this.cropBox);
      this.scene.remove(this.cropBox);
      this.transformControls.attach(this.object);
    }
  }

  activateMeasurement(measure) {
    if (measure) {
      this.boxHelper = new THREE.BoxHelper( this.object, 0x37474F );
      this.scene.add( this.boxHelper );
      this.object.add( this.xLabel);
      this.object.add(this.yLabel);
      this.object.add(this.zLabel);
      this.updateLabels();
    } else if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.object.remove( this.xLabel);
      this.object.remove(this.yLabel);
      this.object.remove(this.zLabel);
    }
  }

  createLabels() {
    this.xDiv = document.createElement( 'div' );
    this.xDiv.className = 'label x';
    this.xDiv.style.marginTop = '-1em';
    this.xLabel = new CSS2DObject( this.xDiv );
    
    this.yDiv = document.createElement( 'div' );
    this.yDiv.className = 'label y';
    this.yDiv.style.marginBottom = '-1em';
    this.yLabel = new CSS2DObject(this.yDiv);

    this.zDiv = document.createElement( 'div' );
    this.zDiv.className = 'label z';
    this.zDiv.style.marginTop = '-1em';
    this.zLabel = new CSS2DObject( this.zDiv );
  }

  updateLabels() {
    if (!this.boxHelper) {
      return;
    }
    this.object.geometry.computeBoundingBox();
    this.box3.copy( this.object.geometry.boundingBox ).applyMatrix4( this.object.matrixWorld );
    this.box3.getSize(this.size);

    this.xDiv.textContent = this.size.x;
    this.xLabel.position.set(this.size.x / 2, 0, 0,);

    this.yDiv.textContent = this.size.y;
    this.yLabel.position.set(0, this.size.y / 2, 0);

    this.zDiv.textContent = this.size.z;
    this.zLabel.position.set(0, 0, this.size.z / 2);
  }

  handleRefresh() {
    const { t } = this.props;
    // check serverside 
    const response = 1;
    if (response == 0) {
      // load file
    } else if (response == 1) {
      // 2.1 Not found
      document.getElementById('uuid_error').innerHTML = t('edit.warning.notfound') + document.getElementById('uuid').value
    } else if (response == 2) {
      // 2.2 In progress
      document.getElementById('uuid_error').innerHTML = t('edit.warning.progress_1') + document.getElementById('uuid').value + t('edit.warning.progress_2')
    }
  }

  pass() {

  }

  render() {

    const { t } = this.props;

    return (
      <div class='content' ref={ref => (this.mount = ref)}>
        <div class='edit_toolbar'>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
          {this.state.loaded &&
            <div class='edit_box'>
              <p>{ this.state.name }</p>
              <hr></hr>
              <p class="heading_interaction">{t('edit.conversion')}</p>
              <button onClick={() => {this.pass()}} class="recon_button">{t('edit.reconstruct')}</button>
              <hr></hr>
              <p class="heading_interaction">{t('edit.transformation')}</p>
              <Attribute name={t('edit.scale')} editor={this} x={ this.state.scale.x } y={this.state.scale.y} z={this.state.scale.z}></Attribute>
              <Attribute name='Rotation' editor={this} x={this.state.rotation.x} y={this.state.rotation.y} z={this.state.rotation.z}></Attribute>
              <Attribute name='Translation' editor={this} x={this.state.translation.x} y={this.state.translation.y} z={this.state.translation.z}></Attribute>
              <hr></hr>
              <p class="heading_interaction">{t('edit.crop.crop')}</p>
              <label class="container">{t('edit.activate')}
                <input id="crop" type="checkbox" onClick={(event) => {
                  this.activateCrop(event.target.checked);
                }}/>
                <span class="checkmark"></span>
              </label>
              <br></br>
              {this.state.crop &&
                <button onClick={() => {this.cropObject()}} class="crop_button spacing">{t('edit.crop.remove')}</button>
              }
              {this.state.crop &&
                <button onClick={() => {this.cropObjectInverse()}} class="crop_button">{t('edit.crop.keep')}</button>
              }
              {!this.state.crop &&
                <button class="crop_button spacing" disabled>{t('edit.crop.remove')}</button>
              }
              {!this.state.crop &&
                <button class="crop_button" disabled>{t('edit.crop.keep')}</button>
              }
              <hr></hr>
              <p class="heading_interaction">{t('edit.measure')}</p>
              <label class="container">{t('edit.activate')}
                <input id="measure" type="checkbox" onClick={(event) => {
                  this.activateMeasurement(event.target.checked);
                }}/>
                <span class="checkmark"></span>
              </label>
              <button onClick={() => {this.handleDownload()}} class='edit_download'><i class="fa fa-download"></i></button>
              <button onClick={() => {this.handleRemove()}} class='edit_remove'><i class="fa fa-remove"></i></button>
            </div>
          }
          {this._cropValue &&
            <button class='edit_upload' disabled><i class="fa fa-upload"></i></button>
          }
          {!this._cropValue &&
            <button tooltip="Uploaded files won't be saved on the server" onClick={() => {this.handleFileSelect()}} class='edit_upload'><i class="fa fa-upload"></i></button>
          }
        </div>
        <div class='infobox'>
          <label for="uuid" class="formfield">ID</label>
          <input id="uuid" name="uuid" class="formfield_input"></input>
          <button onClick={() => {this.handleRefresh()}} class='edit_refresh'><i class="fa fa-refresh"></i></button>
          <br></br>
          <small id="uuid_error" class="edit_warning"></small>
          <br></br>
          <br></br>
          {t('edit.interaction')}
        </div>
      </div>
    )
  }
}

export default withTranslation()(Edit);
