import React, { Component } from 'react'
import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import Attribute from "./AttributeComponent";
import { Loader } from './Loader.js';

import './EditComponent.css';


class Edit extends Component {
  constructor(props) {
    super(props);
    this.scene = new THREE.Scene();
    this.state = {loaded: false, name: ''};
  }

  addObject(object, filename) {
    this.scene.add(object);
    this.transformControls.attach(object);
    this.setState({loaded: true, name: filename});
  }

  componentDidMount() {
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 50);
    this.scene.background = new THREE.Color(0xFEFFE8);
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);
    this.mount.appendChild(renderer.domElement);
    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement);
    var scope = this;
    var animate = function () {
      requestAnimationFrame(animate);
      renderer.render(scope.scene, camera);
      controls.update();
    };
    animate();
    // transformcontrols
    this.transformControls = new TransformControls(camera, renderer.domElement)
    this.scene.add(this.transformControls);
    window.addEventListener('keydown', function (event) {
      switch (event.key) {
        case "g":
          this.transformControls.setMode("translate")
          break
        case "r":
          this.transformControls.setMode("rotate")
          break
        case "s":
          this.transformControls.setMode("scale")
          break
      }
    })
    // loader
    var loader = new Loader(this);
    document.addEventListener('dragover', function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }, false);
    document.addEventListener('drop', function (event) {
      event.preventDefault();
      if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
      if (event.dataTransfer.items) {
        loader.loadItemList(event.dataTransfer.items);
      } else {
        console.log('door 2');
        loader.loadFiles(event.dataTransfer.files);
      }
    }, false);

  }

  render() {

    const loader_ = new OBJLoader();

    function handleSubmit(e) {
      e.preventDefault();
      loader_.load(
        'models/monster.obj',
        function (object) {
          this.scene.add(object);
        },
        function (xhr) {
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
          console.log('An error happened');
        }
      );
    }

    return (
      <div ref={ref => (this.mount = ref)}>
        <div class='edit_toolbar'>
          {this.state.loaded &&
            <div class='edit_box'>
              <p>{ this.state.name }</p>
              <hr></hr>
              <Attribute name='Scale' x={1} y={1} z={1}></Attribute>
              <Attribute name='Rotation' x={0} y={0} z={0}></Attribute>
              <Attribute name='Translation' x={0} y={0} z={0}></Attribute>
              <button onClick={handleSubmit} class='edit_download'><i class="fa fa-download"></i></button>
              <button onClick={handleSubmit} class='edit_remove'><i class="fa fa-remove"></i></button>
            </div>
          }
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
          <button onClick={handleSubmit} class='edit_upload'><i class="fa fa-upload"></i></button>
        </div>
      </div>
    )
  }
}

export default Edit;
