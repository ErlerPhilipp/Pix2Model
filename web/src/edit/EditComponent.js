import React, { Component } from 'react'
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
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
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import InfiniteGridHelper from './InfiniteGridHelper.js';

import Dropdown from 'react-dropdown';
import ReactTooltip from 'react-tooltip';
import JSZip from 'jszip';

import { FaInfoCircle, FaRegObjectUngroup, FaTheRedYeti } from 'react-icons/fa'; 
import { isMobile } from 'react-device-detect';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { solid, regular, brands, icon } from '@fortawesome/fontawesome-svg-core/import.macro' // <-- import styles to be used


import { BrowserView, MobileView } from 'react-device-detect';

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
    this.refreshTimer = null;
  }

  componentDidMount() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
    this.scene.background = new THREE.Color(0xfbebc3);
    this.light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(this.light);
    this.mount.appendChild(this.renderer.domElement);

    const gridHelper = new InfiniteGridHelper( 1, 10 );
    this.scene.add( gridHelper );
    this.labelRenderer = new CSS2DRenderer();

    if (isMobile) {
      this.camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 20) / (window.innerHeight - 20), 0.1, 1000);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.labelRenderer.setSize(window.innerWidth - 20, window.innerHeight - 20);
    } else {
      this.camera = new THREE.PerspectiveCamera(75, (window.innerWidth - 300) / (window.innerHeight - 105), 0.1, 1000);
      this.labelRenderer.setSize(window.innerWidth - 300, window.innerHeight - 105);

    }
    this.labelRenderer.domElement.setAttribute("name", "orbit_controls");
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.left = '10px';
    this.mount.appendChild(this.labelRenderer.domElement);

    this.camera.position.z = 5;
    this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
    this.transformControls = new TransformControls(this.camera, this.labelRenderer.domElement);
    this.loader = new Loader(this);
    var scope = this;
    this.transformControls.addEventListener('mouseDown', function () {
      scope.controls.enabled = false;
    });
    this.transformControls.addEventListener('mouseUp', function () {
      scope.controls.enabled = true;
    });
    this.transformControls.addEventListener('change', function () {
      scope.renderScene(scope)
    });
    this.controls.addEventListener('change', function() {
      scope.renderScene(scope)
    })
    // transformcontrols
    this._handleUpdate = this.updateTransformation.bind(this)
    this.transformControls.addEventListener('mouseUp', () => this.updateTransformation(false));
    this.scene.add(this.transformControls);
    window.addEventListener('keydown', function (event) {
      scope.setTransformation(scope, event.key)
    })
    if (isMobile) {
      window.addEventListener('resize', function() {
        scope.camera.aspect = (window.innerWidth - 20) / (window.innerHeight - 20);
        scope.camera.updateProjectionMatrix();
        scope.renderer.setSize(window.innerWidth - 20, window.innerHeight - 20);
        scope.labelRenderer.setSize(window.innerWidth - 20, window.innerHeight - 20);
        scope.renderScene(scope)
      })
    } else {
      window.addEventListener('resize', function() {
        scope.camera.aspect = (window.innerWidth - 300) / (window.innerHeight - 105);
        scope.camera.updateProjectionMatrix();
        scope.renderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
        scope.labelRenderer.setSize(window.innerWidth - 300, window.innerHeight - 105);
        scope.renderScene(scope)
      })
    }
    // loader
    document.addEventListener('dragover', function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }, false);
    document.addEventListener('drop', function (event) {
      event.preventDefault();
      if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
      if (event.dataTransfer.items) {
        console.log("I am loading items!");
        console.log(event.dataTransfer.items);  
        scope.loader.loadItemList(event.dataTransfer.items, function(data){
          console.log("callback here! ");
          console.log(data);
          console.log(scope.object);
        });
      } else {
        console.log(event.dataTransfer.files);
        scope.loader.loadFiles(event.dataTransfer.files, function(){});
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
      this.uploadFilesFromServer()
    }
    if (isMobile) {
      console.log("componentDidMount");
      console.log(this.props);
      if(document.getElementById('uuid').value){
        this.uploadFilesFromServer();
      }
    }
    this.startRefreshInterval();

    this.renderScene(this)
  }

  componentDidUpdate(props){
    console.log("componentDidUpdate");
    console.log(this.props);
  }

  componentWillUnmount(){
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  /**
   * Try to load object from server every 60 seconds until the object is loaded.
   */
  startRefreshInterval = () => {
    this.refreshTimer = setInterval(() => {
      if (!this.state.loaded) {
        console.log("Rrefreshing the page...");
        this.uploadFilesFromServer()
      } else {
        console.log("Object loaded, stopping refresh.");
        clearInterval(this.refreshTimer);
      }
    }, 60000);
  };

  renderScene(scope) {
    scope.renderer.render(scope.scene, scope.camera);
    scope.labelRenderer.render( scope.scene, scope.camera );
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
    scope.renderScene(scope)
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
   * UPLOAD FILES FROM SERVER SERVER CALL
   * 
   * Upload multiple files inside a zip file from the server based on the ID within the ID field
   */
    uploadFilesFromServer() {
      const { t } = this.props;
      var id = document.getElementById('uuid').value
      if (!isMobile){
        var step = document.getElementById("options") ? document.getElementById("options").children[0].innerText : undefined
        var version = document.getElementById("options") ? document.getElementById("options").children[1].innerText : undefined
      }
      var url_ = `/backend/files?id=${id}`
      if (step && version) {
        url_ = `/backend/files?id=${id}&step=${step}&version=${version}`
      }

      if(isMobile){
        step = this.props.step;
        version = "v000";
        url_ = `/backend/files?id=${id}&step=${step}&version=${version}`
      }

      console.log("Load from server: ", url_);

      if(step === "pointcloud") {
        this.setState({loading: true})
        axios({
          method: 'get',
          url: url_,
          responseType: 'arraybuffer',
          responseEncoding: 'binary'
        })
        .then(res => {
          const zip = new JSZip();;
          return zip.loadAsync(res.data);
        })
        .then(zip => {
          const promises = Object.keys(zip.files).map(relativePath => {
            const file = zip.file(relativePath);
            return file.async('arraybuffer').then(content => ({
              fileName: relativePath,
              content: content
            }));
          });
          return Promise.all(promises);
        })
        .then(pointCloudFiles => {
          const pointsPly = pointCloudFiles[0].content;
          //const pointsVis = pointCloudFiles[1].content;
          const images = pointCloudFiles[1].content;
          //this.pointsVis = pointsVis;
          this.images = images;
          var geometry = new PLYLoader().parse( pointsPly);
          var material = new THREE.PointsMaterial( { size: 0.005 } );
          material.vertexColors = true
          var mesh = new THREE.Points(geometry, material)
          //this.addObject(mesh, pointsPly.filename)
          this.addObject(mesh, 'points.ply')
          this.loadVersions("pointcloud", version)
          this.setState({loading: false})
        })
        .catch((error) => {
          if (error.response && error.response.status == 404 || error.response.status == 500) {
            axios({
              method: 'get',
              url: `/backend/filestatus?id=${id}`
            })
            .then(res => {
              if (res.status == 201 || res.status == 500) {
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
      else {                            // step == mesh
        this.setState({loading: true})
        axios({
          method: 'get',
          url: url_,
          responseType: 'arraybuffer',
          responseEncoding: 'binary'
        })
        .then(res => {
          const zip = new JSZip()
          return zip.loadAsync(res.data);
        })
        .then(zip => {
          const fileContents = [];
          const textFilePromises = [];
          let blobFileContent;

          Object.keys(zip.files).forEach(relativePath => {
            const file = zip.file(relativePath);
            if(relativePath.split('.').pop() === 'obj' || relativePath.split('.').pop() === 'mtl') {
              textFilePromises.push(file.async('text').then(content => {
                fileContents.push({ fileName: relativePath, content: content });
              }));
            }else if (relativePath.split('.').pop() === 'jpg') {
              blobFileContent = file.async('blob');
            }
          });
  
          return Promise.all(textFilePromises).then(() => {
            return blobFileContent.then(blob=> {
              fileContents.push({ fileName: 'texture.jpg', content: blob });
              return fileContents;
            });
          });
        })
        .then(fileContents => {
          const mtlFile = fileContents[0];
          const objFile = fileContents[1];
          const jpgFile = fileContents[2];
          this.texture = jpgFile.content;
          this.mtl = mtlFile.content;
  
          const textureLoader = new THREE.TextureLoader();
          let texture = textureLoader.load(URL.createObjectURL(jpgFile.content));
          texture.name = "MVSTexture"
          const material = new THREE.MeshBasicMaterial( {
            map: texture,
            name: "mesh_textured.mtl"
          });
  
          let object = new OBJLoader().parse(objFile.content);
          object.traverse( function ( child) {
            if ( child instanceof THREE.Mesh ) {
              child.material = material;
            }
          })
          this.addObject(object);
          this.loadVersions("mesh", version)
          this.setState({loading: false});
        });
      }
   }

  /**
   * RECONSTRUCT MESH SERVER CALL 
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

    var id = document.getElementById('uuid').value
    this.setState({loading: true})

    this.images = this.applyTransformationToCameras(this.images);
    
    // Send pointsPlyVis to server
    var formData = new FormData();
    let pointsVisBlob = new Blob([this.pointsVis], { type: 'application/octet-stream' });
    formData.append("file", pointsVisBlob);
    axios({
      method: 'post',
      url: `/backend/savefile?id=${id}&type=pointVis`,
      data : formData,
      headers : {
        'Content-Type' : 'multipart/form-data'
      }
    })
    .then(res => {
      // Send images to server (camera poses)
      var formData = new FormData();
      let imagesBlob = new Blob([this.images], { type: 'application/octet-stream' });
      formData.append("file", imagesBlob);
      axios({
        method: 'post',
        url: `/backend/savefile?id=${id}&type=images`,
        data : formData,
        headers : {
          'Content-Type' : 'multipart/form-data'
        }
      })
    })
    .then(res => {
      // Send points.ply to server
      var exporter = new PLYExporter();
      var formData = new FormData();
      if (this.object.type == 'Points') {
        var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
        var b = new Blob( [ exporter.parse( new THREE.Mesh(this.object.geometry, material), 
          {excludeAttributes: ['index'], binary: true, littleEndian: true} ) ], { type: 'text/plain' } )
        formData.append("file", b)
      } else {
        formData.append("file", new Blob( [ exporter.parse( this.object, 
          {excludeAttributes: ['index']} ) ], { type: 'text/plain' } ));
      }
      return axios({
        method: 'post',
        url: `/backend/savefile?id=${id}&type=pointcloud`,
        data : formData,
        headers : {
          'Content-Type' : 'multipart/form-data'
        }
      })
    })
    .then(res => {
      // Send reconstruct command to server
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
    if (!isMobile) {
      this.transformControls.attach(this.object);
    }
    // this.object.name = filename;
    this.setState({loaded: true, name: filename});
    // this.frameObject(this);
    // this.centerPivotPointWithinBoundingBox(this)
    this.centerCameraToObject(this);
    this.renderScene(this);
  }

  centerCameraToObject(scope) {
    if (!scope.object) {
      return
    }

    scope.object.geometry.computeBoundingBox(scope);
    const boundingBox = new THREE.Box3();
    boundingBox.copy( scope.object.geometry.boundingBox ).applyMatrix4( scope.object.matrixWorld );
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    scope.camera.lookAt(center);
  }

  centerPivotPointWithinBoundingBox(scope) {
    if (!scope.object) {
      return
    }
    scope.object.geometry.computeBoundingBox();
    const boundingBox = new THREE.Box3();
    boundingBox.copy( scope.object.geometry.boundingBox ).applyMatrix4( scope.object.matrixWorld );
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const updatedObjectPosition = scope.object.position.add(center)
    scope.object.position.set(updatedObjectPosition.x, updatedObjectPosition.y, updatedObjectPosition.z);
    var positions = scope.object.geometry.attributes.position.array
    var updatedPositions = []
    for (var i = 0; i < positions.length; i += 3) {
      const uPos = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).sub(scope.object.position)
      updatedPositions.push(uPos.x, uPos.y, uPos.z)
    }
    scope.object.geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(updatedPositions), 3));
    scope.object.updateMatrix();
    scope.updateTransformation(true);
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
    this.renderScene(this)
  }

  /**
   * DOWNLOAD OBJECT
   */
  downloadObject() {
    var link = document.createElement( 'a' );
    if ( link.href ) {
      URL.revokeObjectURL( link.href );
    }
    if (this.object.type == 'Points') {
      var exporter = new PLYExporter();
      var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
      var geometry = this.object.geometry.clone()
      var b = new Blob( [ exporter.parse( new THREE.Mesh(geometry, material), 
        {excludeAttributes: ['index'], binary: true, littleEndian: true} ) ], { type: 'application/octet-stream' } )
      link.href = URL.createObjectURL(b);
    } else {
      var exporter = new OBJExporter();
      let zip = new JSZip();
      // parse mtl file
      const material_obj = new MTLLoader().parse(this.mtl);
      // get material from parsed file
      const material = material_obj.getAsArray()[0];
      zip.file("mesh.mtl", this.mtl);
      zip.file("mesh_textured_material_00_map_Kd.jpg", this.texture);
      let temp_obj = this.object.clone();
      // add material to object
      temp_obj.material = material;
      console.log("temp_obj: ", temp_obj);
      const objBlob =  new Blob( [ exporter.parse( temp_obj ) ], { type: 'application/octet-stream' } );
      zip.file("mesh.obj", objBlob);

      // zip files and create download link
      zip.generateAsync({type: 'blob' }).then(function (content){
        link.href = URL.createObjectURL(content);
        link.download = "object_mtl_texture.zip"
        link.dispatchEvent( new MouseEvent( 'click' ) );
        return;
      })
      

    }
    link.download = this.state.name;
    link.dispatchEvent( new MouseEvent( 'click' ) );
  }

  /**
   * FEATURE: Transformation
   * 
   * Apply Transformation to camera poses -> this.images
   */
  applyTransformationToCameras(images_txt) {
    let entries = this.read_images(images_txt);
    // TODO: Do transformation stuff
    let world_transform = new THREE.Matrix4();
    let world_translation = new THREE.Vector3(this.state.translation.x, this.state.translation.y, this.state.translation.z);
    let world_scale = new THREE.Vector3(this.state.scale.x, this.state.scale.y, this.state.scale.z);
    let world_rotation_euler = new THREE.Euler(this.state.rotation.x, this.state.rotation.y, this.state.rotation.z, "XYZ");
    let world_rotation_quat = new THREE.Quaternion();
    world_rotation_quat.setFromEuler(world_rotation_euler);
    world_transform.compose(world_translation, world_rotation_quat, world_scale);
    console.log("world_transform: ", world_transform);
    console.log("");
    let camera_pose_transforms = [];

    console.log("entries before transformation: ", entries);

    for (let i=1; i < entries.length; i++){ // start by 1 to skip header
      let entry = entries[i];
      let qw = entry.QW;
      let qx = entry.QX;
      let qy = entry.QY;
      let qz = entry.QZ;
      let tx = entry.TX;
      let ty = entry.TY;
      let tz = entry.TZ;

      let quat = new THREE.Quaternion(qx,qy,qz,qw);
      let rot_mat = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), quat, new THREE.Vector3(1, 1, 1));

      // to get the camera position use R from quaternions and t from translation vector
      // camera_pose = -R^T * t ... the transpose inverse of the rotation matrix multiplied by the translation vector
      const t = new THREE.Vector3(tx,ty,tz);
      const R = new THREE.Matrix3().setFromMatrix4(rot_mat);
      const R_transpose = R.clone().transpose();
      const R_transpose_inverse = R_transpose.clone().invert();
      const camera_pose = t.clone().applyMatrix3(R_transpose_inverse);

      const debug_object = {"t": t, "R": R, "R_transpose": R_transpose, "R_transpose_inverse": R_transpose_inverse}

      // update camera pose
      // side note: Colmap uses right hand coordinate system where positive y axis points down, 
      // while three.js uses right hand coordinate system where positive y axis points up
      const camera_pose_updated = camera_pose.clone().addVectors(camera_pose, world_translation);

      camera_pose_transforms.push(camera_pose_updated); // push to list of camera poses to render cameras for debugging

      // To bring it back from world space to camera space ...
      // t = camera_pose * R^T
      const new_t = camera_pose_updated.clone().applyMatrix3(R_transpose);
      console.log("Old_t: ", t);
      console.log("New_t: ", new_t);

      entries[i].TX = new_t.x;
      entries[i].TY = new_t.y;
      entries[i].TZ = new_t.z;

    }
    console.log("entries after transformation: ", entries);
    let new_images = this.write_images(entries);
    this.render_camera_positions(camera_pose_transforms);
    return new_images;
  }

  render_camera_positions(matrices){
    for(let i=0; i < matrices.length; i++){
      const transformMatrix = matrices[i];

      const box_size = 0.5;
      const boxGeometry = new THREE.BoxGeometry(box_size, box_size, box_size);
      const wireframeGeometry = new THREE.WireframeGeometry(boxGeometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      // Create local axes helper
      const axesHelper = new THREE.AxesHelper(0.5);
      wireframeMesh.add(axesHelper);
      wireframeMesh.position.add(transformMatrix);
      this.scene.add(wireframeMesh);

    }
  }


  read_images(images_txt) {
    // ToDo: change from text to binary format for better results!

    // Convert the ArrayBuffer to a string
    if(images_txt instanceof ArrayBuffer){
      const decoder = new TextDecoder('utf-8');
      images_txt = decoder.decode(images_txt);    // TODO: for large files consider ansynchronous call
    }
    // Split the file content into lines
    const lines = images_txt.split('\n');
    // Initialize an array to store the entries
    const entries = [];

    let header = ""
    for (let i=0; i < 4; i++){
      header += (lines[i] + "\n");
    }

    entries.push({
      header: header
    });

    // Iterate through the lines
    for (let i = 4; i < lines.length - 1; i += 2) {
        const imageInfo = lines[i].trim().split(' ');
        const imageId = imageInfo[0];
        const qw = parseFloat(imageInfo[1]);
        const qx = parseFloat(imageInfo[2]);
        const qy = parseFloat(imageInfo[3]);
        const qz = parseFloat(imageInfo[4]);
        const tx = parseFloat(imageInfo[5]);
        const ty = parseFloat(imageInfo[6]);
        const tz = parseFloat(imageInfo[7]);

        const cameraId = imageInfo[8];
        const name = imageInfo.slice(9).join(' ');

        const points2DInfo = lines[i + 1].trim().split(' ');
        const points2D = [];
        for (let j = 0; j < points2DInfo.length; j += 3) {
            const x = points2DInfo[j];
            const y = points2DInfo[j + 1];
            const point3DId = points2DInfo[j + 2];
            points2D.push({ x, y, point3DId });
        }

        entries.push({
            IMAGE_ID: imageId,
            QW: qw,
            QX: qx,
            QY: qy,
            QZ: qz,
            TX: tx,
            TY: ty,
            TZ: tz,
            CAMERA_ID: cameraId,
            NAME: name,
            POINTS2D: points2D,
        });
    }

    return entries;
  }


  write_images(entries) {
    // Initialize an empty string for the new file content
    let newImagesTxt = '';

    // Add the header to the new file content
    newImagesTxt += entries[0].header;

    // Iterate through the entries and format them
    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      // Format the entry data as a string
      let entryStr = `${entry.IMAGE_ID} ${entry.QW} ${entry.QX} ${entry.QY} ${entry.QZ} ${entry.TX} ${entry.TY} ${entry.TZ} ${entry.CAMERA_ID} ${entry.NAME}\n`;
      
      // Add the points2D data as a string
      const points2D = entry.POINTS2D;
      for (let j = 0; j < points2D.length; j++) {
        const point = points2D[j];
        // entryStr += `${point.x} ${point.y} ${point.point3DId} `; remove points2D data because they are not needed for reconstruction
      }
      entryStr += '\n'; // Newline after points2D data
      
      newImagesTxt += entryStr; // Add the formatted entry to the new file content
    }

    console.log(newImagesTxt.split("\n").slice(0,6));
    return newImagesTxt;
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
    console.log("rotation", rotation);
    console.log("scale: ", scale);
    console.log("translation: ", translation);
    this.renderScene(this);
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
    this.renderScene(this);
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



  /* global BigInt */



  readFusedPlyVis(fused_ply_vis) {
    const numPoints = Number(new DataView(fused_ply_vis.slice(0, 8)).getBigUint64(0, true));
    let readable_vis = [];
    let totalVisibleImages = 0;
    let debug_visible_images = [];
    console.log("fused_ply_vis: ", fused_ply_vis);
    console.log("Number of points: ", numPoints);
    // read fused_ply_vis data and write it into an array, skip first 2*4 bytes because BigInt
    for( let i=2; i < numPoints+2; i++ ){
      const byte_start = i*4 + totalVisibleImages*4;
      const visible_images = new DataView(fused_ply_vis.slice(byte_start, byte_start+4)).getUint32(0, true);
      const byte_length = 4 + visible_images*4;
      debug_visible_images.push({index: i, num_images: visible_images});
      totalVisibleImages += visible_images;
      const entry = {byte_start: byte_start, byte_length: byte_length}
      readable_vis.push(entry);
    }
    console.log("debug visible Images: ", debug_visible_images);

    return readable_vis;
  }

  /**
   * FEATURE: Crop
   * 
   * Modify the fused.ply.vis file to adhere to the cropped pointcloud
   */
  deletePointsFromFused_ply_vis(fused_ply_vis, remainingIndices) {
    /**
     * #### ####      first 8 bytes is a BigInt describing the number of points
     * ####           next 4 bytes is a uint describing the number of visible images of that point
     * #### * images  next 4 bytes times visible images describes the indices of the visible images of that point
     * .              next 4 bytes is a uint describing the number of visible images of the next point and so on...
     * .
     * .
     */

    try{
      const numPoints = Number(new DataView(fused_ply_vis.slice(0, 8)).getBigUint64(0, true));
      let readable_vis = this.readFusedPlyVis(fused_ply_vis);

      // count bytes of the entries left after filtering
      let new_ply_vis_size = 8; // include first Big Int numPoints
      for( let i=0; i<remainingIndices.length; i++){
        const idx = remainingIndices[i];
        new_ply_vis_size += readable_vis[idx].byte_length;
      }

      // create new fused_ply_vis with remaining entries
      const newBuffer = new ArrayBuffer(new_ply_vis_size);
      const newDataView = new DataView(newBuffer);
      newDataView.setBigUint64(0, BigInt(remainingIndices.length), true);
      let data_offset = 8;
      
      for( let i=0; i<remainingIndices.length; i++){
        const idx = remainingIndices[i];
        const byte_start = readable_vis[idx].byte_start;
        const byte_end = readable_vis[idx].byte_start + readable_vis[idx].byte_length;
        const visData = fused_ply_vis.slice(byte_start, byte_end);
        const visDataView = new DataView(visData);
        for (let j = 0; j < visData.byteLength; j++){
          newDataView.setUint8(data_offset+j, visDataView.getUint8(j), true);
        }
        data_offset += readable_vis[idx].byte_length;
      }

      this.readFusedPlyVis(newDataView.buffer);

      return newDataView.buffer;
    }catch(error){
      console.log(error);
    }
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
        past.push(that.object.clone())
        var model = {...that.state.model, past, canUndo: true, future: [], canRedo: false}
        that.setState({model: model, loading: false})
        // that.centerPivotPointWithinBoundingBox(that)
        // that.updateTransformation(true);
        that.renderScene(that);
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
    var point_idx = 0;
    var remainingIndices = []
    for (var i = 0; i < positions.length; i += 3) {
      const d = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld).sub(that.cropBox.position);
      if (!(Math.abs(dx.dot(d)) <= (that.cropBox.scale.x / 2) && Math.abs(dy.dot(d)) <= (that.cropBox.scale.y / 2) && Math.abs(dz.dot(d)) <= (that.cropBox.scale.z / 2))) {
        remainingIndices.push(point_idx);
        const worldPosition = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld)
        const worldNormals = new THREE.Vector3(normals[i], normals[i+1], normals[i+2]).applyQuaternion(that.object.quaternion)
        updatedPositions.push(worldPosition.x, worldPosition.y, worldPosition.z)
        updatedColors.push(colors[i], colors[i+1], colors[i+2])
        updatedNormals.push(worldNormals.x, worldNormals.y, worldNormals.z)
      }
      point_idx++;
    }
    console.log("Remaining Indices: ", remainingIndices);
    that.pointsVis = that.deletePointsFromFused_ply_vis(that.pointsVis, remainingIndices);
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
        past.push(that.object.clone())
        var model = {...that.state.model, past, future: [], canUndo: true, canRedo: false}
        that.setState({model: model, loading: false})
        // that.centerPivotPointWithinBoundingBox(that)
        // that.updateTransformation(true);
        that.renderScene(that);
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
    var remainingIndices = []
    var point_idx = 0
    for (var i = 0; i < positions.length; i += 3) {
      const d = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld).sub(that.cropBox.position);
      if ((Math.abs(dx.dot(d)) <= (that.cropBox.scale.x / 2) && Math.abs(dy.dot(d)) <= (that.cropBox.scale.y / 2) && Math.abs(dz.dot(d)) <= (that.cropBox.scale.z / 2))) {
        remainingIndices.push(point_idx);
        const worldPosition = new THREE.Vector3(positions[i], positions[i+1], positions[i+2]).applyMatrix4(that.object.matrixWorld)
        const worldNormals = new THREE.Vector3(normals[i], normals[i+1], normals[i+2]).applyQuaternion(that.object.quaternion)
        updatedPositions.push(worldPosition.x, worldPosition.y, worldPosition.z)
        updatedColors.push(colors[i], colors[i+1], colors[i+2])
        updatedNormals.push(worldNormals.x, worldNormals.y, worldNormals.z)
      }
      point_idx++;
    }
    console.log("Remaining Indices: ", remainingIndices);
    that.pointsVis = that.deletePointsFromFused_ply_vis(that.pointsVis, remainingIndices);
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
    this.renderScene(this);
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
    this.renderScene(this);
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
    this.renderScene(this);
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
    if (isMobile) {
      return
    }
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
    this.renderScene(this);
  }

  redo() {
    if (isMobile) {
      return
    }
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
    this.renderScene(this);
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
    const fontawesomedirectory = `${window.location.protocol + "//" + window.location.host + window.location.pathname + "fontawesome-free-6.2.0-web/css/fontawesome.min.css"}`
    return (
      <div className='content' ref={ref => (this.mount = ref)}>
        <MobileView>
          {this.state.loaded &&
            <div>
              <button data-tip data-for='tooltip_upload_disabled' className='edit_upload_mobile' disabled><FontAwesomeIcon icon={solid('upload')}/></button>
              <ReactTooltip id='tooltip_upload_disabled' backgroundColor='rgb(34,102,153)'>
                <span>Remove current file to upload a new one</span>
              </ReactTooltip>
              <button data-tip data-for='tooltip_download' onClick={() => {this.downloadObject()}} className='edit_download_mobile'><FontAwesomeIcon icon={solid('download')}/></button>
              <ReactTooltip id='tooltip_download' backgroundColor='rgb(34,102,153)'>
                <span>Download this file with the applied modifications</span>
              </ReactTooltip>
            </div>
          }
          {!this.state.loaded &&
            <div>
            <button data-tip data-for='tooltip_upload' onClick={(event) => {this.handleFileSelect(event)}} className='edit_upload_mobile'><FontAwesomeIcon icon={solid('upload')}/></button>
            <ReactTooltip id='tooltip_upload' backgroundColor='rgb(34,102,153)'>
              <span>Uploaded files won't be stored on the server</span>
            </ReactTooltip>
            <button data-tip data-for='tooltip_download' className='edit_download_mobile' disabled><FontAwesomeIcon icon={solid('download')}/></button>
            <ReactTooltip id='tooltip_download' backgroundColor='rgb(34,102,153)'>
              <span>Download this file with the applied modifications</span>
            </ReactTooltip>
          </div>
          }
        </MobileView>
        <BrowserView>
          <div className='edit_toolbar'>
            {this.state.loaded &&
              <div className='edit_box'>
                <p>{ this.state.name }</p>
                {/*{this.state.pointcloud &&
                  <div>
                    <hr></hr>
                    <div className="heading_interaction_wrapper">
                      <p className="heading_interaction">{t('edit.conversion')}</p>
                      <FontAwesomeIcon icon={solid('circle-info')} data-tip data-for='tooltip_conversion'/>
                      <ReactTooltip id='tooltip_conversion' backgroundColor='rgb(34,102,153)'>
                        <span>Create reconstructed mesh based on the edited mesh. The edited mesh will be saved with a new version number</span>
                      </ReactTooltip>
                    </div>
                    <button onClick={() => {this.reconstructMesh()}} className="recon_button">{t('edit.reconstruct')}</button>
                  </div>
                }*/}
                <hr></hr>
                <div className="heading_interaction_wrapper">
                  <p className="heading_interaction">{t('edit.transformation')}</p>
                </div>
                <Attribute name={t('edit.scale')} editor={this} x={ this.state.scale.x } y={this.state.scale.y} z={this.state.scale.z}></Attribute>
                <Attribute name='Rotation' editor={this} x={this.state.rotation.x} y={this.state.rotation.y} z={this.state.rotation.z}></Attribute>
                <Attribute name='Translation' editor={this} x={this.state.translation.x} y={this.state.translation.y} z={this.state.translation.z}></Attribute>
                <hr></hr>
                {/*{this.state.pointcloud &&
                <div>
                  <div className="heading_interaction_wrapper">
                    <p className="heading_interaction">{t('edit.crop.crop')}</p>
                    <FontAwesomeIcon icon={solid('circle-info')} data-tip data-for='tooltip_crop'/>
                    <ReactTooltip id='tooltip_crop' backgroundColor='rgb(34,102,153)'>
                      <span>When activated, a box appears on the canvas, which can be transformed using the gizmo. Use the intersecting area between the box and the mesh to crop the mesh.
                      </span>
                    </ReactTooltip>
                  </div>
                  <label className="container">{t('edit.activate')}
                    <input id="crop" type="checkbox" onClick={(event) => {
                      this.activateCrop(event.target.checked);
                    }}/>
                    <span className="checkmark"></span>
                  </label>
                  <br></br>
                  {this.state.crop &&
                    <button onClick={() => {this.cropObjectInverse()}} className="crop_button spacing">{t('edit.crop.keep')}</button>
                  }
                  {this.state.crop &&
                    <button onClick={() => {this.cropObject()}} className="crop_button">{t('edit.crop.remove')}</button>
                  }
                  {!this.state.crop &&
                    <button className="crop_button spacing" disabled>{t('edit.crop.keep')}</button>
                  }
                  {!this.state.crop &&
                    <button className="crop_button" disabled>{t('edit.crop.remove')}</button>
                  }
                  <hr></hr>
                </div>
                }*/}
                <div className="heading_interaction_wrapper">
                  <p className="heading_interaction">{t('edit.measure')}</p>
                  <FontAwesomeIcon icon={solid('circle-info')} data-tip data-for='tooltip_measure'/>
                  <ReactTooltip id='tooltip_measure' backgroundColor='rgb(34,102,153)'>
                    <span>The measurements display the size of the bouding box in x, y and z direction.
                    </span>
                  </ReactTooltip>
                </div>
                <label className="container">{t('edit.activate')}
                  <input id="measure" type="checkbox" onClick={(event) => {
                    this.activateMeasurement(event.target.checked);
                  }}/>
                  <span className="checkmark"></span>
                </label>
                <button data-tip data-for='tooltip_download' onClick={() => {this.downloadObject()}} className='edit_download'><FontAwesomeIcon icon={solid('download')}/></button>
                <ReactTooltip id='tooltip_download' backgroundColor='rgb(34,102,153)'>
                  <span>Download this file with the applied modifications</span>
                </ReactTooltip>
                <button onClick={() => {this.removeObject()}} className='edit_remove'><FontAwesomeIcon icon={solid('remove')}/></button>
              </div>
            }
            {this.state.loaded &&
              <div>
                <button data-tip data-for='tooltip_upload_disabled' className='edit_upload' disabled><FontAwesomeIcon icon={solid('upload')}/></button>
                <ReactTooltip id='tooltip_upload_disabled' backgroundColor='rgb(34,102,153)'>
                  <span>Remove current file to upload a new one</span>
                </ReactTooltip>
              </div>
            }
            {!this.state.loaded &&
              <div>
              <button data-tip data-for='tooltip_upload' onClick={(event) => {this.handleFileSelect(event)}} className='edit_upload'><FontAwesomeIcon icon={solid('upload')}/></button>
              <ReactTooltip id='tooltip_upload' backgroundColor='rgb(34,102,153)'>
                <span>Uploaded files won't be stored on the server</span>
              </ReactTooltip>
            </div>
            }
          </div>
          <div className='infobox'>
            <label for="uuid" className="formfield">ID</label>
            <input id="uuid" name="uuid" className="formfield_input"></input>
            {!this.state.loading &&
              <button onClick={() => {this.uploadFilesFromServer()}} className='edit_refresh'><FontAwesomeIcon icon={solid('refresh')}/></button>
            }
            {this.state.loading &&
              <button onClick={() => {this.uploadFilesFromServer()}} className='edit_refresh loading'><FontAwesomeIcon icon={solid('refresh')}/></button>
            }
            <br></br>
            <button id="uuid_error" onClick={() => {this.downloadLogfile()}} className="edit_warning"></button>
            {Object.keys(this.state.options).length !== 0 &&
              <div className="edit_options_refresh" id="options">
                <Dropdown options={Object.keys(Object.fromEntries(Object.entries(this.state.options).filter(([_, v]) => v != [])))} onChange={(value) => this.handleSlectedStepChange(value.value)} value={this.state.selected_step} />
                <Dropdown options={this.state.option_versions} value={this.state.selected_version} />
              </div>
            }
            <br></br>
            <br></br>
            {!this.state.pointcloud &&
              <div>
                <Trans i18nKey='edit.interaction' components={
                  { button_translation: <button className="transformation_button" onClick={() => this.setTransformation(this, "t")} />,
                    button_rotation: <button className="transformation_button" onClick={() => this.setTransformation(this, "r")} />,
                    button_scale: <button className="transformation_button" onClick={() => this.setTransformation(this, "s")} />,
                    button_increase_light: <button className="transformation_button" onClick={() => this.setTransformation(this, "+")} />,
                    button_decrease_light: <button className="transformation_button" onClick={() => this.setTransformation(this, "-")} />,
                    button_frame: <button className="transformation_button" onClick={() => this.frameObject(this)} />
                  }}/>
              </div>
            }
            {this.state.pointcloud &&
              <div>
                <Trans i18nKey='edit.interaction_no_lights' components={
                  { button_translation: <button className="transformation_button" onClick={() => this.setTransformation(this, "t")} />,
                    button_rotation: <button className="transformation_button" onClick={() => this.setTransformation(this, "r")} />,
                    button_scale: <button className="transformation_button" onClick={() => this.setTransformation(this, "s")} />,
                    button_frame: <button className="transformation_button" onClick={() => this.frameObject(this)} />
                }}/>
              </div>  
            }
          </div>
          <div className='edit_undo_redo_box'>
            <button disabled={!this.state.model.canUndo} key="undo" onClick={() => this.undo()} className='edit_undo_redo_button'><FontAwesomeIcon icon={solid('undo')}/></button>
            <button disabled={!this.state.model.canRedo} key="redo" onClick={() => this.redo()} className='edit_undo_redo_button'><FontAwesomeIcon icon={solid('undo')} style={{transform: 'scaleX(-1)'}}/></button>
          </div>
        </BrowserView>
      </div>
    )
  }
}

export default withTranslation()(Edit);
