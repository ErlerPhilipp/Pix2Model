import React, { useRef, useState } from 'react'
import { Engine, Scene, useBeforeRender, useClick, useHover } from 'react-babylonjs'
import { Vector3, Color3, AssetsManager } from '@babylonjs/core'

import './EditComponent.css';

const DefaultScale = new Vector3(1, 1, 1);
const BiggerScale = new Vector3(1.25, 1.25, 1.25);

const SpinningBox = (props) => {
  const boxRef = useRef(null);

  const [clicked, setClicked] = useState(false);
  useClick(
    () => setClicked(clicked => !clicked),
    boxRef
  );

  const [hovered, setHovered] = useState(false);
  useHover(
    () => setHovered(true),
    () => setHovered(false),
    boxRef
  );

  const rpm = 5;
  useBeforeRender((scene) => {
    if (boxRef.current) {
      var deltaTimeInMillis = scene.getEngine().getDeltaTime();
      boxRef.current.rotation.y += ((rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000));
    }
  });
  return (<box name={props.name} ref={boxRef} size={2} position={props.position} scaling={clicked ? BiggerScale : DefaultScale}>
    <standardMaterial name={`${props.name}-mat`} diffuseColor={hovered ? props.hoveredColor : props.color} specularColor={Color3.Black()} />
  </box>);
}

function SceneWithSpinningBoxes() {
  var loader = new AssetsManager(Scene);

  function handleSubmit(e) {
    e.preventDefault();
    console.log('You clicked submit..');
    var box = loader.addMeshTask("box", "", "https://cdn.rawgit.com/wingnutt/misc/master/", "mesh01.obj");
    loader.load();
  }

  return(
  <div>
    <div class='toolbar'>
      <button  onClick={handleSubmit}>Upload File</button>
      <button  onClick={handleSubmit}>Download File</button>
    </div>
    <Engine antialias adaptToDeviceRatio canvasId='babylonJS' >
      <Scene>
        <arcRotateCamera name="camera1" target={Vector3.Zero()} alpha={Math.PI / 2} beta={Math.PI / 4} radius={8} />
        <hemisphericLight name='light1' intensity={0.7} direction={Vector3.Up()} />
        <SpinningBox name='left' position={new Vector3(-2, 0, 0)}
          color={Color3.FromHexString('#EEB5EB')} hoveredColor={Color3.FromHexString('#C26DBC')}
        />
        <SpinningBox name='right' position={new Vector3(2, 0, 0)}
          color={Color3.FromHexString('#C8F4F9')} hoveredColor={Color3.FromHexString('#3CACAE')}
        />
      </Scene>
    </Engine>
  </div>
)
  };

export default SceneWithSpinningBoxes;