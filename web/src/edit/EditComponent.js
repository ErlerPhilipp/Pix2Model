import React, { Component } from 'react'
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import Attribute from "./AttributeComponent";
import { Loader } from './Loader.js';
import { withTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';
import { CSG } from 'three-csg-ts';
import axios from 'axios';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import Dropdown from 'react-dropdown';
import ReactTooltip from 'react-tooltip';
import { FaInfoCircle, FaTheRedYeti } from 'react-icons/fa'; 
import { isMobile } from 'react-device-detect';

import 'react-dropdown/style.css';
import './EditComponent.css';


class Edit extends Component {
  constructor(props) {
    super(props);
    this.scene = new THREE.Scene();
    this.state = {
      crop: false,
      loaded: false,
      name: '',
      rotation: {x: 0, y: 0, z: 0},
      translation: {x: 0, y: 0, z: 0},
      scale: {x: 1, y: 1, z: 1},
      options: {},
      option_versions: [],
      selected_version: '',
      selected_step: '',
      loading: false,
      pointcloud: false,
      model: {
        past: [],
        future: [],
        canUndo: false,
        canRedo: false
      }
    };
  }

  componentDidMount() {
    if (isMobile) {
      return
    }
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
    this.scene.background = new THREE.Color(0xfbebc3);
    this.light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(this.light);
    this.mount.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper( 10, 50 );
    this.scene.add( gridHelper );
    var camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 300) / (window.innerHeight - 105), 0.1, 1000);
    var labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    this.mount.appendChild(labelRenderer.domElement);

    camera.position.z = 5;
    this.controls = new OrbitControls(camera, labelRenderer.domElement);
    this.transformControls = new TransformControls(camera, labelRenderer.domElement);
    this.loader = new Loader(this);
    var scope = this;
    this.transformControls.addEventListener('mouseDown', function () {
      scope.controls.enabled = false;
    });
    this.transformControls.addEventListener('mouseUp', function () {
      scope.controls.enabled = true;
    });
    // transformcontrols
    this._handleUpdate = this.updateTransformation.bind(this)
    this.transformControls.addEventListener('mouseUp', () => this.updateTransformation(false));
    this.scene.add(this.transformControls);
    window.addEventListener('keydown', function (event) {
      scope.setTransformation(scope, event.key)
    })
    window.addEventListener('resize', function() {
      camera.aspect = (window.innerWidth - 300) / (window.innerHeight - 105);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
    })
    // animation
    var animate = function () {
      requestAnimationFrame(animate);
      renderer.render(scope.scene, camera);
      labelRenderer.render( scope.scene, camera );
      scope.controls.update();
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
    // add object when ID in url is set
    const id = new URLSearchParams(window.location.search).get('id')
    // for testing : this.setState({options: {'mesh': ['v001', 'v000', 'v059'], 'pointcloud': ['v002', 'v003', 'v059']}, option_versions: ['v001', 'v000', 'v059']})
    if (id) {
      document.getElementById('uuid').value = id
      this.uploadFileFromServer()
    }
  }

  setTransformation(scope, transformation) {
    switch (transformation) {
      case "t":
        scope.transformControls.setMode("translate")
        break
      case "r":
        scope.transformControls.setMode("rotate")
        break
      case "s":
        scope.transformControls.setMode("scale")
        break
      case "f":
        scope.frameObject(scope);
        break
      case "+":
        scope.light.intensity += 0.5;
        break
      case "-":
        scope.light.intensity -= 0.5;
        break
    }
  }

  loadTestBunnyWithTexture() {
    const objLoader = new OBJLoader()
    objLoader.load(
      '/testfiles/bunny.obj',
    (object) => {
      const texture = new THREE.TextureLoader().load( '/testfiles/bunny-atlas.jpg' );
      const material = new THREE.MeshBasicMaterial( { map: texture} );
      
      object.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          child.material = material;
        }
      });
      this.scene.add(object);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    })
  }

  /**
   * SERVER CALL
   * 
   * Load the versions of the file that is set in the ID field.
   * Those versions belong to step1 / pointcloud or to step2 / mesh.
   * The versions are accessible to the user via the dropdown menu.
   * If the method is called without params, then the dropdown menu
   * is set to the latest version that is available on the server-side.
   * 
   * @param {string} step 'mesh' | 'pointcloud'
   * @param {string} version 'vxxx'
   */
  loadVersions(step = undefined, version = undefined) {
    var id = document.getElementById('uuid').value
    this.setState({loading: true})
    axios({
      method: 'get',
      url: `/backend/versions?id=${id}`
    })
      .then(res => {
        this.setState({options: res.data})
        if (step && version && this.state.options && step in this.state.options && this.state.options[step] && this.state.options[step].includes(version)) {
          this.setState({option_versions: res.data[step], selected_step: step, selected_version: version})
        } else {
          var versions = []
          if (res.data.mesh && res.data.mesh.length > 0) {
            versions = res.data.mesh
            step = 'mesh'
          } else if (res.data.pointclound && res.data.pointclound.length > 0) {
            versions = res.data.pointclound
            step = 'pointclound'
          }
          this.setState({option_versions: versions, selected_version: versions.sort().reverse()[0], selected_step: step})
        }
        this.setState({loading: false})
        this.setFileStatus('')
      })
      .catch((error) => {
        const { t } = this.props;
        this.setFileStatus(t('edit.warning.versions') + id)
        this.setState({loading: false})
      })
  }

  /**
   * SERVER CALL
   * 
   * Upload a file from the server based on the ID within the ID field
   */
  uploadFileFromServer() {
    const { t } = this.props;
    var id = document.getElementById('uuid').value
    var step = document.getElementById("options") ? document.getElementById("options").children[0].innerText : undefined
    var version = document.getElementById("options") ? document.getElementById("options").children[1].innerText : undefined
    var url_ = `/backend/file?id=${id}`
    if (step && version) {
      url_ = `/backend/file?id=${id}&step=${step}&version=${version}`
    }
    this.setState({loading: true})
    axios({
      method: 'get',
      url: url_,
      responseType: 'arraybuffer',
      reponseEncoding: 'binary'
    })
      .then(res => {
        var geometry = new PLYLoader().parse( res.data );
        if (geometry.index) {
          geometry.computeVertexNormals()
          var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
          var mesh = new THREE.Mesh( geometry, material );
          this.addObject(mesh, res.headers["filename"])
          this.loadVersions(step, version)
        } else {
          var material = new THREE.PointsMaterial( { size: 0.005 } );
          material.vertexColors = true
          var mesh = new THREE.Points(geometry, material)
          this.addObject(mesh, res.headers["filename"])
          this.loadVersions(step, version)
        }
      })
      .catch((error) => {
        if (error.response && error.response.status == 404) {
          axios({
            method: 'get',
            url: `/backend/filestatus?id=${id}`
          })
          .then(res => {
            if (res.status == 201) {
              this.setFileStatus(t('edit.warning.progress.file').replace('{id}', id), 'yellow')
            }
          })
          .catch((error)=>{
            if (error.response.status == 404 || error.response.status == 405) {
              this.setFileStatus(t('edit.error.filenotfound').replace('{id}', id), 'red')
            } else if (error.response.status == 400) {
              this.setFileStatus(error.response.data, 'red', true)
            } else {
              this.setFileStatus(t('edit.error.server.file').replace('{id}', id), 'red')
            }
          })
        } else {
          this.setFileStatus(t('edit.error.server.file').replace('{id}', id), 'red')
        }
        this.setState({loading: false})
      })
  }

  /**
   * SERVER CALL
   * 
   * Reconstruct mesh. This feature is only available,
   * if the current displayed object is a pointcloud (not a mesh),
   * which was loaded from the server.
   * 
   * The current edit-status of the file is stored with a new version 
   * on the server and then the server starts the reconstruction of the
   * pointcloud.
   */
  reconstructMesh() {
    const { t } = this.props;
    var exporter = new PLYExporter();
    var formData = new FormData();
    if (this.object.type == 'Points') {
      var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
      var b = new Blob( [ exporter.parse( new THREE.Mesh(this.object.geometry, material), {excludeAttributes: ['index'], binary: true} ) ], { type: 'text/plain' } )
      formData.append("file", b)
    } else {
      formData.append("file", new Blob( [ exporter.parse( this.object, {excludeAttributes: ['index']} ) ], { type: 'text/plain' } ));
    }
    var id = document.getElementById('uuid').value
    this.setState({loading: true})
    axios({
      method: 'post',
      url: `/backend/savefile?id=${id}`,
      data : formData,
      header : {
        'Content-Type' : 'multipart/form-data'
      }
    })
    .then(res => {
      axios.post(`/backend/reconstructmesh?id=${id}&version=${res.data}`)
      this.setState({loading: false})
      this.setFileStatus(t('edit.warning.progress.reconstruction').replace('{id}', id), 'green')
    })
    .catch((error) => {
      this.setFileStatus(t('edit.error.server.reconstruction').replace('{id}', id), 'red')
      this.setState({loading: false})
    })
  }


  /**
   * SERVER CALL
   * 
   * Download logfile from server
   */
  downloadLogfile() {
    var id = document.getElementById('uuid').value
    var step = document.getElementById("options") ? document.getElementById("options").children[0].innerText : undefined
    var version = document.getElementById("options") ? document.getElementById("options").children[1].innerText : undefined
    var url_ = `/backend/logfile?id=${id}`
    if (step && version) {
      url_ = `/backend/logfile?id=${id}&step=${step}&version=${version}`
    }
    axios({
      method: 'get',
      url: url_
    })
      .then(res => {
        if (!res.data) {
          return
        }
        var link = document.createElement( 'a' );
        if ( link.href ) {
          URL.revokeObjectURL( link.href );
        }
        link.href = URL.createObjectURL( new Blob( [ res.data ], { type: 'text/plain' } ) );
        window.open(link,'_blank');
      })
      .catch((error) => {
      })
  }


  /**
   * ADD OBJECT
   * 
   * Add a given mesh / pointcloud to the scene
   * 
   * @param {THREE.js object} object 
   * @param {string} filename 
   */
  addObject(object, filename) {
    this.removeObject()
    if (object.type == 'Group') {
      this.object = object.children[0]
    } else {
      this.object = object
    }
    if (this.object.type == 'Points') {
      this.setState({pointcloud: true});
    }
    this.scene.add(this.object);
    this.transformControls.attach(this.object);
    this.setState({loaded: true, name: filename});
    this.frameObject(this)
  }

  /**
   * ADD OBJECT
   * 
   * Create file selector instance to upload
   * meshes via the upload button
   */
  buildFileSelector(){
    this.fileSelector = document.createElement('input');
    this.fileSelector.setAttribute('type', 'file');
    this.fileSelector.addEventListener('change', () => {this.loader.loadFiles(this.fileSelector.files)}, false);
  }

  /**
   * ADD OBJECT
   */
  handleFileSelect = (e) => {
    e.preventDefault();
    this.fileSelector.click();
  }

  /**
   * REMOVE OBJECT
   */
  removeObject() {
    this.transformControls.detach(this.object);
    this.scene.remove(this.object);
    this.scene.remove(this.cropBox);
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
    }
    var model = {
      past: [],
      future: [],
      canUndo: false,
      canRedo: false
    }
    this.setState({loaded: false, name: '', options: {}, option_versions: [], pointcloud: false, model: model});
  }

  /**
   * DOWNLOAD OBJECT
   */
  downloadObject() {
    var exporter = new PLYExporter();
    var link = document.createElement( 'a' );
    if ( link.href ) {
      URL.revokeObjectURL( link.href );
    }
    if (this.object.type == 'Points') {
      var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
      var b = new Blob( [ exporter.parse( new THREE.Mesh(this.object.geometry, material), {excludeAttributes: ['index'], binary: true} ) ], { type: 'text/plain' } )
      link.href = URL.createObjectURL(b);
    } else {
      link.href = URL.createObjectURL( new Blob( [ exporter.parse( this.object ) ], { type: 'text/plain' } ) );
    }
    link.download = this.state.name;
    link.dispatchEvent( new MouseEvent( 'click' ) );
  }

  /**
   * FEATURE: Transformation
   * 
   * Update Transformation via the gizmo / transformcontrols 
   */
  updateTransformation(stateUpdated) {
    if (!this.object) {
      return;
    }
    if (!stateUpdated) {
      var past = this.state.model.past
      var oldModel = this.object.clone()
      oldModel.position.x = this.state.translation.x
      oldModel.position.y = this.state.translation.y
      oldModel.position.z = this.state.translation.z
      oldModel.rotation.x = this.state.rotation.x / 180 * Math.PI
      oldModel.rotation.y = this.state.rotation.y / 180 * Math.PI
      oldModel.rotation.z = this.state.rotation.z / 180 * Math.PI
      oldModel.scale.x = this.state.scale.x
      oldModel.scale.y = this.state.scale.y
      oldModel.scale.z = this.state.scale.z
      past.push(oldModel)
      var model = {...this.state.model, past, canUndo: true, future: [], canRedo: false}
      this.setState({model: model})
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

  /**
   * FEATURE: Transformation
   * 
   * Update Transformation via the UI numberfield boxes
   */
  updateValue(attribute, value) {
    const { t } = this.props;
    var past = this.state.model.past
    past.push(this.object.clone())
    var model = {...this.state.model, past, canUndo: true, future: [], canRedo: false}
    this.setState({model: model})
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
    this.updateTransformation(true);
  }

  /**
   * FEATURE: Crop
   * 
   * Activate the crop feature.
   * It displays a box that can be transformed by the user. 
   * The user can then cut away or leave the intersection between
   * the box and the mesh / pointcloud
   */
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

  /**
   * FEATURE: Crop
   * 
   * Create the cropbox, which is used to cut away parts of the displayed mesh / pointcloud
   */
  createCropBox() {
    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true
    });
    this.cropBox = new THREE.Mesh( geometry, material );
  }
  
  /**
   * FEATURE: Crop
   * 
   * Cut the intersection between the cropbox and the mesh / pointcloud
   */
  cropObject() {
    if (!this.object) {
      return;
    }
    this.setState({ loading: true})
    this.cropBox.scale.x = Math.abs(this.cropBox.scale.x)
    this.cropBox.scale.y = Math.abs(this.cropBox.scale.y)
    this.cropBox.scale.z = Math.abs(this.cropBox.scale.z)
    this.cropBox.updateMatrix();
    var croppedObject
    const that = this
    setTimeout(function() {
      try {
        if (that.object.type == 'Points') {
          croppedObject = that.removePointsInsideBox(that)
        } else {
          that.object.updateMatrix();
          var material_mesh = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
          const bspObject = CSG.fromMesh(that.object);
          const bspBox = CSG.fromMesh(that.cropBox);                        
          const bspResult = bspBox.inverse().intersect(bspObject.inverse());
          croppedObject = CSG.toMesh(bspResult, that.object.matrix);
          croppedObject.geometry.computeVertexNormals()
          croppedObject.material = material_mesh;
        }
        that.scene.add(croppedObject);
        that.scene.remove(that.object);
        that.object = croppedObject;
        var past = that.state.model.past
        past.push(this.object.clone())
        var model = {...that.state.model, past, canUndo: true, future: [], canRedo: false}
        that.setState({model: model, loading: false})
      } catch (error) {
        that.setState({loading: false})
        // set status message
      }
    }, 100);
  }

  removePointsInsideBox(that) {
    var geometry = new THREE.BufferGeometry();
    that.cropBox.updateMatrix()
    const dx = new THREE.Vector3(1, 0, 0).applyEuler(that.cropBox.rotation).normalize()
    const dy = new THREE.Vector3(0, 1, 0).applyEuler(that.cropBox.rotation).normalize()
    const dz = new THREE.Vector3(0, 0, 1).applyEuler(that.cropBox.rotation).normalize()
    var positions = that.object.geometry.attributes.position.array
    var updatedPositions = []
    var colors = that.object.geometry.attributes.color.array
    var updatedColors = []
    var normals = that.object.geometry.attributes.normal.array
    var updatedNormals = []
    for (var i = 0; i < positions.length; i += 3) {
      const d = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld).sub(that.cropBox.position);
      if (!(Math.abs(dx.dot(d)) <= (that.cropBox.scale.x / 2) && Math.abs(dy.dot(d)) <= (that.cropBox.scale.y / 2) && Math.abs(dz.dot(d)) <= (that.cropBox.scale.z / 2))) {
        const worldPosition = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld)
        const worldNormals = new THREE.Vector3(normals[i], normals[i+1], normals[i+2]).applyQuaternion(that.object.quaternion)
        updatedPositions.push(worldPosition.x, worldPosition.y, worldPosition.z)
        updatedColors.push(colors[i], colors[i+1], colors[i+2])
        updatedNormals.push(worldNormals.x, worldNormals.y, worldNormals.z)
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(updatedPositions), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(updatedColors), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(updatedNormals), 3));
    var material = new THREE.PointsMaterial( { size: 0.005 } );
		material.vertexColors = true
    return new THREE.Points(geometry, material);
  }

  /**
   * FEATURE: Crop
   * 
   * Keep the intersection between the cropbox and the mesh / pointcloud and cut away everything else
   */
  cropObjectInverse() {
    if (!this.object) {
      return;
    }
    this.cropBox.scale.x = Math.abs(this.cropBox.scale.x)
    this.cropBox.scale.y = Math.abs(this.cropBox.scale.y)
    this.cropBox.scale.z = Math.abs(this.cropBox.scale.z)
    this.cropBox.updateMatrix();
    var croppedObject
    this.setState({loading: true})
    const that = this
    setTimeout(function() {
      try {
        if (that.object.type == 'Points') {
          croppedObject = that.keepPointsInsideBox(that)
        } else {
          that.object.updateMatrix();
          var material_mesh = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
          const bspObject = CSG.fromMesh(that.object);
          const bspBox = CSG.fromMesh(that.cropBox);                        
          const bspResult = bspBox.intersect(bspObject.inverse());
          croppedObject = CSG.toMesh(bspResult, that.object.matrix);
          croppedObject.geometry.computeVertexNormals()
          croppedObject.material = material_mesh;
        }
        that.scene.add(croppedObject);
        that.scene.remove(that.object);
        that.object = croppedObject;
        var past = that.state.model.past
        past.push(this.object.clone())
        var model = {...that.state.model, past, future: [], canUndo: true, canRedo: false}
        that.setState({model: model, loading: false})
      } catch (error) {
        that.setState({loading: false})
        // set status message
      }
    }, 100);
  }

  keepPointsInsideBox(that) {
    var geometry = new THREE.BufferGeometry();
    that.cropBox.updateMatrix()
    const dx = new THREE.Vector3(1, 0, 0).applyEuler(that.cropBox.rotation).normalize()
    const dy = new THREE.Vector3(0, 1, 0).applyEuler(that.cropBox.rotation).normalize()
    const dz = new THREE.Vector3(0, 0, 1).applyEuler(that.cropBox.rotation).normalize()
    var positions = that.object.geometry.attributes.position.array
    var updatedPositions = []
    var colors = that.object.geometry.attributes.color.array
    var updatedColors = []
    var normals = that.object.geometry.attributes.normal.array
    var updatedNormals = []
    for (var i = 0; i < positions.length; i += 3) {
      const d = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld).sub(that.cropBox.position);
      if ((Math.abs(dx.dot(d)) <= (that.cropBox.scale.x / 2) && Math.abs(dy.dot(d)) <= (that.cropBox.scale.y / 2) && Math.abs(dz.dot(d)) <= (that.cropBox.scale.z / 2))) {
        const worldPosition = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld)
        const worldNormals = new THREE.Vector3(normals[i], normals[i+1], normals[i+2]).applyQuaternion(that.object.quaternion)
        updatedPositions.push(worldPosition.x, worldPosition.y, worldPosition.z)
        updatedColors.push(colors[i], colors[i+1], colors[i+2])
        updatedNormals.push(worldNormals.x, worldNormals.y, worldNormals.z)
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(updatedPositions), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(updatedColors), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(updatedNormals), 3));
    var material = new THREE.PointsMaterial( { size: 0.005 } );
		material.vertexColors = true
    return new THREE.Points(geometry, material);
  }

  /**
   * FEATURE: Measurement
   * 
   * Activate the measurement feature.
   * It displays a boundingbox for the visible mesh / pointcloud and
   * adds labels with the measurements to the boundingbox
   */
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

  /**
   * FEATURE: Measurement
   * 
   * Create labels for the measurements of a mesh / pointcloud
   * Only visible if the corresponding checkbox is checked 
   */
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

  /**
   * FEATURE: Measurement
   * 
   * Update labels for the measurements of a mesh / pointcloud
   */
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

  /**
   * DROPDOWN
   * 
   * Set the versions that are available for a step (step1 / pointcloud or step2 / mesh)
   * whenever the user toggles the step in the first dropdown box
   * 
   * @param {string} step : 'mesh' | 'pointcloud'
   */
  handleSlectedStepChange(step) {
    if (step == 'mesh') {
      this.setState({option_versions: this.state.options.mesh, selected_version: this.state.options.mesh.sort().reverse()[0]})
    } else {
      this.setState({option_versions: this.state.options.pointcloud, selected_version: this.state.options.pointcloud.sort().reverse()[0]})
    }
  }

  setFileStatus(message, color='red', downloadable = false) {
    document.getElementById('uuid_error').innerHTML = message
    document.getElementById('uuid_error').style.color = color
    if (downloadable) {
      document.getElementById('uuid_error').style.cursor = 'pointer'
      document.getElementById('uuid_error').classList.add('customHoverButton');
      document.getElementById('uuid_error').classList.remove('customHoverDiv');
    } else {
      document.getElementById('uuid_error').style.cursor = 'unset'
      document.getElementById('uuid_error').classList.remove('customHoverButton');
      document.getElementById('uuid_error').classList.add('customHoverDiv');
    }
  }

  undo() {
    var past = this.state.model.past
    var future = this.state.model.future
    future.push(this.object.clone())

    var object = past.pop()
    this.scene.add(object);
    this.scene.remove(this.object);
    this.object = object;
    this.object.updateMatrix()
    this.transformControls.attach(this.object)

    var canUndo = past.length > 0 ? true : false
    var canRedo = true
    var model = {future, past, canUndo, canRedo}
    this.updateTransformation(true);
    this.setState({model: model})
  }

  redo() {
    var future = this.state.model.future
    var past = this.state.model.past
    past.push(this.object.clone())

    var object = future.pop()
    this.scene.add(object);
    this.scene.remove(this.object);
    this.object = object;
    this.object.updateMatrix()
    this.transformControls.attach(this.object)

    var canUndo = true
    var canRedo = future.length > 0 ? true : false
    var model = {future, past, canUndo, canRedo}
    this.updateTransformation(true);
    this.setState({model: model})
  }

  frameObject(scope) {
    if (!scope.object) {
      return
    }

    scope.object.geometry.computeBoundingBox();
    const boundingBox = new THREE.Box3();
    boundingBox.copy( scope.object.geometry.boundingBox ).applyMatrix4( scope.object.matrixWorld );
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    scope.controls.target.set(center.x, center.y, center.z)
    scope.controls.update()

    const maxDim = Math.max( size.x, size.y, size.z );
    const fov = scope.controls.object.fov * ( Math.PI / 180 );
    let cameraZ = Math.abs( (maxDim / 2) / Math.tan( fov / 2 ) );
    cameraZ *= 1.5;
    
    var directionVector = new THREE.Vector3()
    directionVector.copy(scope.controls.object.position)
    directionVector = directionVector.sub(center)
    const unitDirectionVector = directionVector.normalize().multiplyScalar(cameraZ).add(center)
    
    scope.controls.object.position.set(unitDirectionVector.x, unitDirectionVector.y, unitDirectionVector.z)
    scope.controls.update()
  }

  componentDidUpdate(prevProps) {
    if(prevProps.showItem !== this.props.showItem) {
      ReactTooltip.rebuild();
    }
  }

  render() {

    const { t } = this.props;

    if (isMobile) {
      return <div class="edit_unavailable"> This content is unavailable on mobile</div>
    }

    return (
      <div class='content' ref={ref => (this.mount = ref)}>
        <div class='edit_toolbar'>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
          {this.state.loaded &&
            <div class='edit_box'>
              <p>{ this.state.name }</p>
              {this.state.pointcloud &&
                <div>
                  <hr></hr>
                  <div class="heading_interaction_wrapper">
                    <p class="heading_interaction">{t('edit.conversion')}</p>
                    <FaInfoCircle data-tip data-for='tooltip_conversion'/>
                    <ReactTooltip id='tooltip_conversion' backgroundColor='rgb(34,102,153)'>
                      <span>Create reconstructed mesh based on the edited mesh. The edited mesh will be saved with a new version number</span>
                    </ReactTooltip>
                  </div>
                  <button onClick={() => {this.reconstructMesh()}} class="recon_button">{t('edit.reconstruct')}</button>
                </div>
              }
              <hr></hr>
              <div class="heading_interaction_wrapper">
                <p class="heading_interaction">{t('edit.transformation')}</p>
              </div>
              <Attribute name={t('edit.scale')} editor={this} x={ this.state.scale.x } y={this.state.scale.y} z={this.state.scale.z}></Attribute>
              <Attribute name='Rotation' editor={this} x={this.state.rotation.x} y={this.state.rotation.y} z={this.state.rotation.z}></Attribute>
              <Attribute name='Translation' editor={this} x={this.state.translation.x} y={this.state.translation.y} z={this.state.translation.z}></Attribute>
              <hr></hr>
              {this.state.pointcloud &&
              <div>
                <div class="heading_interaction_wrapper">
                  <p class="heading_interaction">{t('edit.crop.crop')}</p>
                  <FaInfoCircle data-tip data-for='tooltip_crop'/>
                  <ReactTooltip id='tooltip_crop' backgroundColor='rgb(34,102,153)'>
                    <span>When activated, a box appears on the canvas, which can be transformed using the gizmo. Use the intersecting area between the box and the mesh to crop the mesh.
                    </span>
                  </ReactTooltip>
                </div>
                <label class="container">{t('edit.activate')}
                  <input id="crop" type="checkbox" onClick={(event) => {
                    this.activateCrop(event.target.checked);
                  }}/>
                  <span class="checkmark"></span>
                </label>
                <br></br>
                {this.state.crop &&
                  <button onClick={() => {this.cropObjectInverse()}} class="crop_button spacing">{t('edit.crop.keep')}</button>
                }
                {this.state.crop &&
                  <button onClick={() => {this.cropObject()}} class="crop_button">{t('edit.crop.remove')}</button>
                }
                {!this.state.crop &&
                  <button class="crop_button spacing" disabled>{t('edit.crop.keep')}</button>
                }
                {!this.state.crop &&
                  <button class="crop_button" disabled>{t('edit.crop.remove')}</button>
                }
                <hr></hr>
              </div>
              }
              <div class="heading_interaction_wrapper">
                <p class="heading_interaction">{t('edit.measure')}</p>
                <FaInfoCircle data-tip data-for='tooltip_measure'/>
                <ReactTooltip id='tooltip_measure' backgroundColor='rgb(34,102,153)'>
                  <span>The measurements display the size of the bouding box in x, y and z direction.
                  </span>
                </ReactTooltip>
              </div>
              <label class="container">{t('edit.activate')}
                <input id="measure" type="checkbox" onClick={(event) => {
                  this.activateMeasurement(event.target.checked);
                }}/>
                <span class="checkmark"></span>
              </label>
              <button data-tip data-for='tooltip_download' onClick={() => {this.downloadObject()}} class='edit_download'><i class="fa fa-download"></i></button>
              <ReactTooltip id='tooltip_download' backgroundColor='rgb(34,102,153)'>
                <span>Download this file with the applied modifications</span>
              </ReactTooltip>
              <button onClick={() => {this.removeObject()}} class='edit_remove'><i class="fa fa-remove"></i></button>
            </div>
          }
          {this.state.loaded &&
            <div>
              <button data-tip data-for='tooltip_upload_disabled' class='edit_upload' disabled><i class="fa fa-upload"></i></button>
              <ReactTooltip id='tooltip_upload_disabled' backgroundColor='rgb(34,102,153)'>
                <span>Remove current file to upload a new one</span>
              </ReactTooltip>
            </div>
          }
          {!this.state.loaded &&
            <div>
            <button data-tip data-for='tooltip_upload' onClick={(event) => {this.handleFileSelect(event)}} class='edit_upload'><i class="fa fa-upload"></i></button>
            <ReactTooltip id='tooltip_upload' backgroundColor='rgb(34,102,153)'>
              <span>Uploaded files won't be stored on the server</span>
            </ReactTooltip>
          </div>
          }
        </div>
        <div class='infobox'>
          <label for="uuid" class="formfield">ID</label>
          <input id="uuid" name="uuid" class="formfield_input"></input>
          {!this.state.loading &&
            <button onClick={() => {this.uploadFileFromServer()}} class='edit_refresh'><i class="fa fa-refresh"></i></button>
          }
          {this.state.loading &&
            <button onClick={() => {this.uploadFileFromServer()}} class='edit_refresh loading'><i class="fa fa-refresh"></i></button>
          }
          <br></br>
          <button id="uuid_error" onClick={() => {this.downloadLogfile()}} class="edit_warning"></button>
          {Object.keys(this.state.options).length !== 0 &&
            <div class="edit_options_refresh" id="options">
              <Dropdown options={Object.keys(Object.fromEntries(Object.entries(this.state.options).filter(([_, v]) => v != [])))} onChange={(value) => this.handleSlectedStepChange(value.value)} value={this.state.selected_step} />
              <Dropdown options={this.state.option_versions} value={this.state.selected_version} />
            </div>
          }
          <br></br>
          <br></br>
          {!this.state.pointcloud &&
            <div>
              <Trans i18nKey='edit.interaction' components={
                { button_translation: <button class="transformation_button" onClick={() => this.setTransformation(this, "t")} />,
                  button_rotation: <button class="transformation_button" onClick={() => this.setTransformation(this, "r")} />,
                  button_scale: <button class="transformation_button" onClick={() => this.setTransformation(this, "s")} />,
                  button_increase_light: <button class="transformation_button" onClick={() => this.setTransformation(this, "+")} />,
                  button_decrease_light: <button class="transformation_button" onClick={() => this.setTransformation(this, "-")} />,
                  button_frame: <button class="transformation_button" onClick={() => this.frameObject(this)} />
                }}/>
            </div>
          }
          {this.state.pointcloud &&
            <div>
              <Trans i18nKey='edit.interaction_no_lights' components={
                { button_translation: <button class="transformation_button" onClick={() => this.setTransformation(this, "t")} />,
                  button_rotation: <button class="transformation_button" onClick={() => this.setTransformation(this, "r")} />,
                  button_scale: <button class="transformation_button" onClick={() => this.setTransformation(this, "s")} />,
                  button_frame: <button class="transformation_button" onClick={() => this.frameObject(this)} />
              }}/>
            </div>  
          }
        </div>
        <div class='edit_undo_redo_box'>
          <button disabled={!this.state.model.canUndo} key="undo" onClick={() => this.undo()} class='edit_undo_redo_button'><i class="fa fa-undo"></i></button>
          <button disabled={!this.state.model.canRedo} key="redo" onClick={() => this.redo()} class='edit_undo_redo_button'><i class="fa fa-undo" style={{transform: 'scaleX(-1)'}}></i></button>
        </div>
      </div>
    )
  }
}

export default withTranslation()(Edit);
