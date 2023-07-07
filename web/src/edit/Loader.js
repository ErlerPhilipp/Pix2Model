import * as THREE from 'three';

import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import { LoaderUtils } from './LoaderUtils.js';


function Loader( editor ) {

	var scope = this;

	this.texturePath = '';

	this.loadItemList = function ( items, callback) {

		LoaderUtils.getFilesFromItemList( items, function ( files, filesMap ) {

			scope.loadFiles( files, filesMap, callback );

		} );

	};

	this.loadFiles = function ( files, filesMap, callback ) {

		if ( files.length > 0 ) {

			var filesMap = filesMap || LoaderUtils.createFilesMap( files );

			var manager = new THREE.LoadingManager();
			manager.setURLModifier( function ( url ) {
				console.log("original url");	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				console.log(url); ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

				url = url.replace( /^(\.?\/)/, '' ); // remove './'
				console.log(url); ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				var file = filesMap[ url ];

				if ( file ) {

					console.log( 'Loading', url );

					return URL.createObjectURL( file );

				}

				return url;

			} );

			manager.addHandler( /\.tga$/i, new TGALoader() );

			for ( var i = 0; i < files.length; i ++ ) {
				console.log("file nr.: ", i);
				console.log(files[i]);


				scope.loadFile( files[ i ], manager, callback );

			}

		}

	};

	this.loadFile = function ( file, manager, callback ) {

		var filename = file.name;
		var extension = filename.split( '.' ).pop().toLowerCase();

		var reader = new FileReader();
		switch ( extension ) { 

			case 'ply':
				reader.addEventListener( 'load', async function ( event ) {
					var contents = event.target.result;
					var geometry = new PLYLoader().parse( contents );
					if (geometry.index) {
						geometry.computeVertexNormals()
						var material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors, side: 2})
						var mesh = new THREE.Mesh( geometry, material );
					} else {
						var material = new THREE.PointsMaterial( { size: 0.005 } );
						material.vertexColors = true
						var mesh = new THREE.Points(geometry, material)
					}
					mesh.name = filename;

					editor.addObject( mesh, filename );

				}, false );
				reader.readAsArrayBuffer( file );
				break;

							
			case 'obj':
				reader.addEventListener( 'load', async function ( event ) {

					var contents = event.target.result;
					filename = "mesh.obj";

					var object = new OBJLoader().parse( contents );
					object.name = filename;					
					editor.addObject( object, filename );
				
				}, false );
				reader.readAsText( file );
				break;

			case 'mtl':
				reader.addEventListener( 'load', async function ( event) {
					// load mtl file
					var contents = event.target.result;
					var mtl = new MTLLoader().parse( contents );
					mtl.name = "objectMat.mtl";
					callback(mtl);
				}, false);
				reader.readAsText( file);
				break;

			case 'jpg':
				reader.addEventListener( 'load', async function ( event ) {
					var contents = event.target.result;
					var obj;
				}, false);
				reader.readAsArrayBuffer(file);
				break;

			default:

				console.error( 'Unsupported file format (' + extension + ').' );

				break;

		}

	};

}

export { Loader };
