import React, { Component } from 'react'
import * as THREE from "three";

import './EditComponent.css';

class Edit extends Component {
  componentDidMount() {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 50);
    this.mount.appendChild(renderer.domElement);
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;
    var animate = function () {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();
  }
  render() {

    function handleSubmit(e) {
      e.preventDefault();
      console.log('You clicked submit..');
    }

    return (
      <div ref={ref => (this.mount = ref)}>
      <div class='toolbar'>
        <button onClick={handleSubmit}>Upload File</button>
        <button onClick={handleSubmit}>Download File</button>
      </div>
      </div>
    )
  }
}

export default Edit;
