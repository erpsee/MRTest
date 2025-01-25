
/* Import everything we need from Three.js */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import ThreeMeshUI from 'three-mesh-ui';
import VRControl from '../utils/VRControl.js';
import ShadowedLight from '../utils/ShadowedLight.js';

import FontJSON from '../dist/assets/Roboto-msdf.json';
import FontImage from '../dist/assets/Roboto-msdf.png';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { string } from 'three/tsl';

let scene, camera, renderer, controls, vrControl;
let meshContainer, meshes, currentMesh;
const objsToTest = [];

let mode = "vr";

window.addEventListener( 'load', init );
window.addEventListener( 'resize', onWindowResize );

// compute mouse position in normalized device coordinates
// (-1 to +1) for both directions.
// Used to raycasting against the interactive elements

const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();
mouse.x = mouse.y = null;

let selectState = false;

window.addEventListener( 'pointermove', ( event ) => {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
} );

window.addEventListener( 'pointerdown', () => {
	selectState = true;
} );

window.addEventListener( 'pointerup', () => {
	selectState = false;
} );

window.addEventListener( 'touchstart', ( event ) => {
	selectState = true;
	mouse.x = ( event.touches[ 0 ].clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( event.touches[ 0 ].clientY / window.innerHeight ) * 2 + 1;
} );

window.addEventListener( 'touchend', () => {
	selectState = false;
	mouse.x = null;
	mouse.y = null;
} );

//

function init() {

	////////////////////////
	//  Basic Three Setup
	////////////////////////

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x505050 );

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.xr.enabled = true;
	
	const vrButton = VRButton.createButton(renderer);
	vrButton.style.bottom = '70px';
	vrButton.style.zIndex = '10'; 
	document.body.appendChild(vrButton);

	// AR-Button hinzufügen
	const arButton = ARButton.createButton(renderer);
	arButton.style.zIndex = '10';
	document.body.appendChild(arButton);

	document.body.appendChild( renderer.domElement );

	// Orbit controls for no-vr
	controls = new OrbitControls( camera, renderer.domElement );
	camera.position.set( 0, 1.6, 0 );
	controls.target = new THREE.Vector3( 0, 1, -1.8 );

	/////////
	// Room
	/////////

	const room = new THREE.LineSegments(
		new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
		new THREE.LineBasicMaterial( { color: 0x808080 } )
	);

	const roomMesh = new THREE.Mesh(
		new THREE.BoxGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
		new THREE.MeshBasicMaterial( { side: THREE.BackSide } )
	);

	scene.add( room );
	objsToTest.push( roomMesh );

	 
	arButton.addEventListener('click', () => {
		console.log('AR-Button gedrückt');
		mode = "ar";
		
		if (scene.children.includes(room)) {
		  scene.remove(room);
		  scene.background = null;
		  console.log('room wurde entfernt');
		}

	  })

	//////////
	// Light
	//////////

	const light = ShadowedLight( {
		z: 10,
		width: 6,
		bias: -0.0001
	} );

	const hemLight = new THREE.HemisphereLight( 0x808080, 0x606060 );

	scene.add( light, hemLight );

	////////////////
	// Controllers
	////////////////

	
	vrControl = VRControl( renderer, camera, scene );

	scene.add( vrControl.controllerGrips[ 0 ], vrControl.controllers[ 0 ] );

	vrControl.controllers[ 0 ].addEventListener( 'selectstart', () => {

		selectState = true;

	} );
	vrControl.controllers[ 0 ].addEventListener( 'selectend', () => {

		selectState = false;

	} );

	////////////////////
	// Primitive Meshes
	////////////////////

	meshContainer = new THREE.Group();
	meshContainer.position.set( 0, 1, -1.9 );
	scene.add( meshContainer );

	//

	const sphere = new THREE.Mesh(
		new THREE.IcosahedronBufferGeometry( 0.3, 1 ),
		new THREE.MeshStandardMaterial( { color: 0x3de364, flatShading: true } )
	);

	const box = new THREE.Mesh(
		new THREE.BoxBufferGeometry( 0.45, 0.45, 0.45 ),
		new THREE.MeshStandardMaterial( { color: 0x643de3, flatShading: true } )
	);

	const cone = new THREE.Mesh(
		new THREE.ConeBufferGeometry( 0.28, 0.5, 10 ),
		new THREE.MeshStandardMaterial( { color: 0xe33d4e, flatShading: true } )
	);

	//

	sphere.visible = box.visible = cone.visible = false;

	meshContainer.add( sphere, box, cone );

	meshes = [ sphere, box, cone ];
	currentMesh = 0;

	showMesh( currentMesh );

	//////////
	// Panel
	//////////

	makePanel();

	//

	renderer.setAnimationLoop( loop );

}

// Shows the primitive mesh with the passed ID and hide the others

function showMesh( id ) {

	meshes.forEach( ( mesh, i ) => {

		mesh.visible = i === id ? true : false;

	} );

}

///////////////////
// UI contruction
///////////////////

function makePanel() {

	// Container block, in which we put the two buttons.
	// We don't define width and height, it will be set automatically from the children's dimensions
	// Note that we set contentDirection: "row-reverse", in order to orient the buttons horizontally

	const container = new ThreeMeshUI.Block( {
		justifyContent: 'center',
		contentDirection: 'column',
		fontFamily: FontJSON,
		fontTexture: FontImage,
		fontSize: 0.07,
		padding: 0.02,
		borderRadius:0.031,
		//backgroundOpacity: 0
	} );

	container.position.set( 0, 0.6, -1.2 );
	container.rotation.x = -0.55;
	scene.add( container );
	
	const textBlock = new ThreeMeshUI.Block({
		height: 0.1,
		width: 0.8,
		justifyContent: 'center',
		offset: 0.01, // distance separating the inner block from its parent
		backgroundOpacity: 0
	});

	container.add( textBlock );

	const trennLine = new ThreeMeshUI.Block({
		height: 0.012,
		width: 0.9,
		justifyContent: 'center',
		offset: 0.01, // distance separating the inner block from its parent
		backgroundOpacity: 1,
		borderRadius:0.006
	});

	container.add( trennLine );

	const instructionsTextBlock = new ThreeMeshUI.Block({
		height: 0.2,
		width: 0.9,
		justifyContent: 'center',
		offset: 0.01, // distance separating the inner block from its parent
		backgroundOpacity: 0
	});


	container.add( instructionsTextBlock );

	const text = new ThreeMeshUI.Text({
		content: 'Welcome to KrarioMart',
		textAlign: 'center',
		padding: 0.05,
	});

	textBlock.add( text )

	const instructionsText = new ThreeMeshUI.Text({
		content: 'Please select "AR" or "VR" to start',
		textAlign: 'center',
		fontSize: 0.05,
	})

	instructionsTextBlock.add( instructionsText )

	/*textBlock.add( new ThreeMeshUI.Text({
		content: 'please select "AR" or "VR" to start',
		textAlign: 'center',
		fontSize: 0.05,
		padding: 0.05
	}))
	 BUTTONS*/

	// We start by creating objects containing options that we will use with the two buttons,
	// in order to write less code.

	const buttonOptions = {
		width: 0.4,
		height: 0.15,
		justifyContent: 'center',
		offset: 0.05,
		margin: 0.02,
		borderRadius: 0.075
	};

	// Options for component.setupState().
	// It must contain a 'state' parameter, which you will refer to with component.setState( 'name-of-the-state' ).

	const hoveredStateAttributes = {
		state: 'hovered',
		attributes: {
			offset: 0.035,
			backgroundColor: new THREE.Color( 0x999999 ),
			backgroundOpacity: 1,
			fontColor: new THREE.Color( 0xffffff )
		},
	};

	const idleStateAttributes = {
		state: 'idle',
		attributes: {
			offset: 0.035,
			backgroundColor: new THREE.Color( 0x666666 ),
			backgroundOpacity: 0.3,
			fontColor: new THREE.Color( 0xffffff )
		},
	};

	// Buttons creation, with the options objects passed in parameters.

	const buttonNext = new ThreeMeshUI.Block( buttonOptions );
	const buttonPrevious = new ThreeMeshUI.Block( buttonOptions );

	// Add text to buttons

	buttonNext.add(
		new ThreeMeshUI.Text( { content: 'next' } )
	);

	buttonPrevious.add(
		new ThreeMeshUI.Text( { content: 'previous' } )
	);

	// Create states for the buttons.
	// In the loop, we will call component.setState( 'state-name' ) when mouse hover or click

	const selectedAttributes = {
		offset: 0.02,
		backgroundColor: new THREE.Color( 0x777777 ),
		fontColor: new THREE.Color( 0x222222 )
	};

	buttonNext.setupState( {
		state: 'selected',
		attributes: selectedAttributes,
		onSet: () => {

			zeigeIframeAlt();

		}
	} );
	buttonNext.setupState( hoveredStateAttributes );
	buttonNext.setupState( idleStateAttributes );

	//

	buttonPrevious.setupState( {
		state: 'selected',
		attributes: selectedAttributes,
		onSet: () => {

			currentMesh -= 1;
			if ( currentMesh < 0 ) currentMesh = 2;
			showMesh( currentMesh );

		}
	} );
	buttonPrevious.setupState( hoveredStateAttributes );
	buttonPrevious.setupState( idleStateAttributes );

	// Add buttons to the container
	container.add( buttonNext, buttonPrevious );
	objsToTest.push( buttonNext, buttonPrevious );

}

// Handle resizing the viewport

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function loop() {

	// Don't forget, ThreeMeshUI must be updated manually.
	// This has been introduced in version 3.0.0 in order
	// to improve performance
	ThreeMeshUI.update();

	controls.update();

	meshContainer.rotation.z += 0.01;
	meshContainer.rotation.y += 0.01;

	renderer.render( scene, camera );

	updateButtons();

}

// Called in the loop, get intersection with either the mouse or the VR controllers,
// then update the buttons states according to result

function updateButtons() {

	// Find closest intersecting object

	let intersect;

	if ( renderer.xr.isPresenting ) {

		vrControl.setFromController( 0, raycaster.ray );

		intersect = raycast();

		// Position the little white dot at the end of the controller pointing ray
		if ( intersect ) vrControl.setPointerAt( 0, intersect.point );

	} else if ( mouse.x !== null && mouse.y !== null ) {

		raycaster.setFromCamera( mouse, camera );

		intersect = raycast();

	}

	// Update targeted button state (if any)

	if ( intersect && intersect.object.isUI ) {

		if ( selectState ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'selected' );

		} else {

			// Component.setState internally call component.set with the options you defined in component.setupState
			intersect.object.setState( 'hovered' );

		}

	}

	// Update non-targeted buttons state

	objsToTest.forEach( ( obj ) => {

		if ( ( !intersect || obj !== intersect.object ) && obj.isUI ) {

			// Component.setState internally call component.set with the options you defined in component.setupState
			obj.setState( 'idle' );

		}

	} );

}


function zeigeIframeAlt() {
	console.log('ar');
	
	if(mode === "ar")
		window.location.href = "https://erpsee.github.io/MRTest/Ui/src/car_test.html?mode=ar";
	else
		window.location.href = "https://erpsee.github.io/MRTest/Ui/src/car_test.html";
}
//

function raycast() {

	return objsToTest.reduce( ( closestIntersection, obj ) => {

		const intersection = raycaster.intersectObject( obj, true );

		if ( !intersection[ 0 ] ) return closestIntersection;

		if ( !closestIntersection || intersection[ 0 ].distance < closestIntersection.distance ) {

			intersection[ 0 ].object = obj;

			return intersection[ 0 ];

		}

		return closestIntersection;

	}, null );

}