import * as THREE from 'three';

import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import { LoaderUtils } from './LoaderUtils.js';


function Loader( editor ) {

	var scope = this;

	this.texturePath = '';

	this.loadItemList = function ( items ) {

		LoaderUtils.getFilesFromItemList( items, function ( files, filesMap ) {

			scope.loadFiles( files, filesMap );

		} );

	};

	this.loadFiles = function ( files, filesMap ) {

		if ( files.length > 0 ) {

			var filesMap = filesMap || LoaderUtils.createFilesMap( files );

			var manager = new THREE.LoadingManager();
			manager.setURLModifier( function ( url ) {

				url = url.replace( /^(\.?\/)/, '' ); // remove './'

				var file = filesMap[ url ];

				if ( file ) {

					console.log( 'Loading', url );

					return URL.createObjectURL( file );

				}

				return url;

			} );

			manager.addHandler( /\.tga$/i, new TGALoader() );

			for ( var i = 0; i < files.length; i ++ ) {

				scope.loadFile( files[ i ], manager );

			}

		}

	};

	this.loadFile = function ( file, manager ) {

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

					var object = new OBJLoader().parse( contents );
					object.name = filename;

					editor.addObject( object, filename );

				}, false );
				reader.readAsText( file );
				break;



			default:

				console.error( 'Unsupported file format (' + extension + ').' );

				break;

		}

	};

}

export { Loader };
