/**
The MIT License

Copyright © 2010-2021 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
var LoaderUtils = {

	createFilesMap: function ( files ) {

		var map = {};

		for ( var i = 0; i < files.length; i ++ ) {

			var file = files[ i ];
			map[ file.name ] = file;

		}

		return map;

	},

	getFilesFromItemList: function ( items, onDone ) {

		// TOFIX: setURLModifier() breaks when the file being loaded is not in root

		var itemsCount = 0;
		var itemsTotal = 0;

		var files = [];
		var filesMap = {};

		function onEntryHandled() {

			itemsCount ++;

			if ( itemsCount === itemsTotal ) {

				onDone( files, filesMap );

			}

		}

		function handleEntry( entry ) {

			if ( entry.isDirectory ) {

				var reader = entry.createReader();
				reader.readEntries( function ( entries ) {

					for ( var i = 0; i < entries.length; i ++ ) {

						handleEntry( entries[ i ] );

					}

					onEntryHandled();

				} );

			} else if ( entry.isFile ) {

				entry.file( function ( file ) {

					files.push( file );

					filesMap[ entry.fullPath.substr( 1 ) ] = file;
					onEntryHandled();

				} );

			}

			itemsTotal ++;

		}

		for ( var i = 0; i < items.length; i ++ ) {

			var item = items[ i ];

			if ( item.kind === 'file' ) {

				handleEntry( item.webkitGetAsEntry() );

			}

		}

	}

};

export { LoaderUtils };