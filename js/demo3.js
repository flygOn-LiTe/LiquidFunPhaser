"use strict";

const PICTURE_FILENAME = "img/photo1.png";
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 460;
const BOX_OFFSET_X = 2.0;
const BOX_OFFSET_Y = -1.25;
const INITIAL_BAR_X = 2.5;
const INITIAL_BAR_Y = 2.0;
const INITIAL_BAR_ANGLE = 0.15;
const METER = 100;

var sprites;
var world;
var barBody;
var barSprite;
var points;
var scoreText;

var meterToPixel = (mx) => mx * METER;
var pixelToMeter = (px) => px / METER;

function createParticleGroup() {
  console.log("createParticleGroup called!");
  if (typeof b2ParticleSystemDef === "undefined") {
    console.error(
      "b2ParticleSystemDef is not defined! LiquidFun is not loaded yet!"
    );
    return;
  }
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.025;
  psd.dampingStrength = 0.4;
  var particleSystem = world.CreateParticleSystem(psd);
  var box = new b2PolygonShape();
  box.SetAsBoxXYCenterAngle(
    1.25,
    1.25,
    new b2Vec2(BOX_OFFSET_X, BOX_OFFSET_Y),
    0
  );
  var particleGroupDef = new b2ParticleGroupDef();
  particleGroupDef.shape = box;
  particleGroupDef.flags = b2_waterParticle;
  console.log("PARTICLE FLAGS", particleGroupDef.flags);
  var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);
}

function CreateBar(barBody, width, height, offsetX, offsetY) {
  const DENSITY = 5;
  const OFFSET_ANGLE = 0;
  var shape = new b2PolygonShape();
  shape.SetAsBoxXYCenterAngle(
    width,
    height,
    new b2Vec2(offsetX, offsetY),
    OFFSET_ANGLE
  );
  barBody.CreateFixtureFromShape(shape, DENSITY);
}

function createEnclosure() {
  var bdDef = new b2BodyDef();
  var enclosure = world.CreateBody(bdDef);
  CreateBar(
    enclosure,
    pixelToMeter(WINDOW_WIDTH) / 2,
    0.05,
    pixelToMeter(WINDOW_WIDTH) / 2,
    pixelToMeter(WINDOW_HEIGHT) + 0.05
  );
  CreateBar(
    enclosure,
    0.05,
    pixelToMeter(WINDOW_HEIGHT) / 2,
    -0.05,
    pixelToMeter(WINDOW_HEIGHT)
  );
  CreateBar(
    enclosure,
    0.05,
    pixelToMeter(WINDOW_HEIGHT) / 2,
    pixelToMeter(WINDOW_WIDTH) + 0.05,
    pixelToMeter(WINDOW_HEIGHT)
  );
}

function InitializeRainMaker() {
  createEnclosure();
  createParticleGroup();
  createInteractiveBar();
}

function tick() {
  const TIME_STEP = 1.0 / 30.0;
  const VELOCITY_ITERATIONS = 8;
  const POSITION_ITERATIONS = 3;

  world.Step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);

  let particles = world.particleSystems[0].GetPositionBuffer();
  for (var i = 0; i < particles.length / 2; i++) {
    let x = meterToPixel(particles[i * 2]);
    let y = meterToPixel(particles[i * 2 + 1]);
    if (sprites[i].y < 1000) {
      if (x < -1 || x > WINDOW_WIDTH + 1) {
        sprites[i].y = 2000;
        points++;
      } else {
        sprites[i].x = x;
        sprites[i].y = y;
      }
    }
  }
  var p = barBody.GetPosition();
  barSprite.setPosition(meterToPixel(p.x), meterToPixel(p.y));
  barSprite.setRotation(barBody.GetAngle());
}

// function LoadBitmapData(game)
// {
// 	let bmd = game.make.bitmapData(64, 64);
// 	bmd.draw('photo', 0,0);
// 	bmd.update();
// 	return bmd;
// }

function SetupParticles(scene, layer) {
  let particles = world.particleSystems[0].GetPositionBuffer();
  for (let i = 0; i < particles.length / 2; i++) {
    let x = meterToPixel(particles[i * 2]);
    let y = meterToPixel(particles[i * 2 + 1]);
    sprites[i] = scene.add.sprite(x, y, "dot");
    sprites[i].setOrigin(0.5, 0.5);

    //let color = Phaser.Display.Color.GetColor(77, 197, 255); //BLUE
    //sprites[i].setTint(color);
    sprites[i].setPipeline("Water");
  }
}

function createInteractiveBar() {
  var bd = new b2BodyDef();
  bd.type = b2_dynamicBody;
  barBody = world.CreateBody(bd);
  CreateBar(barBody, 0.1, 1, 0, 0);
  // Move it to initial position, leaning a bit so that it will ultimately tip
  barBody.SetTransform(
    new b2Vec2(INITIAL_BAR_X, INITIAL_BAR_Y),
    INITIAL_BAR_ANGLE
  );
}

function SetupBarSprite(scene) {
  var p = barBody.GetPosition();
  barSprite = scene.add.sprite(meterToPixel(p.x), meterToPixel(p.y), "bar");
  barSprite.setOrigin(0.5, 0.5);
}

function moveBar(scene) {
  let ix = scene.input.activePointer.worldX;
  let iy = scene.input.activePointer.worldY;
  let imx = pixelToMeter(ix);
  let imy = pixelToMeter(iy);
  var p = barBody.GetPosition();
  var vx = imx - p.x;
  var vy = (imy - p.y) * 2;
  barBody.SetLinearVelocity(new b2Vec2(vx, vy));
}

// function SetupGaming(game) {
// 	points = 0;
// 	scoreText = game.add.text(32, 32, '', { font: "14pt Courier", fill: "#19cb65", stroke: "#119f4e", strokeThickness: 2 });
// }

(function init(divName) {
  // define gravity in LiquidFun and initialize world
  let gravity = new b2Vec2(0, 5);
  world = new b2World(gravity);

  // create minimal phaser.js game:

  const fragShader = `
precision mediump float;
uniform float iTime;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

#define WATER_COL vec3(0.12, 0.60, 1.0)
#define WATER2_COL vec3(0.05, 0.33, 0.90)
#define FOAM_COL vec3(0.18, 0.5, 0.98)  
#define M_2PI 6.283185307
#define M_6PI 18.84955592

float circ(vec2 pos, vec2 c, float s)
{
    c = abs(pos - c);
    c = min(c, 1.0 - c);
    // Sharper foam edges
    return smoothstep(0.0, 0.006, sqrt(s) - sqrt(dot(c, c))) * -1.0;
}

float waterlayer(vec2 uv, float foamPhase)
{
    uv = mod(uv, 1.0);
    float ret = 1.0;
    // Animate the positions with foamPhase
    ret += circ(uv + foamPhase*0.2, vec2(0.37378, 0.277169), 0.0268181);
    ret += circ(uv - foamPhase*0.1, vec2(0.0317477, 0.540372), 0.0193742);
    ret += circ(uv + foamPhase*0.3, vec2(0.430044, 0.882218), 0.0232337);
    ret += circ(uv - foamPhase*0.4, vec2(0.641033, 0.695106), 0.0117864);
    // ...repeat for other circles as before
    // (for brevity, not all are copied here, but do it for your real code)
    return max(ret, 0.0);
}

vec3 water(vec2 uv, float foamPhase)
{
    uv *= vec2(0.95);
    // Texture distortion as before
    float d1 = mod(uv.x + uv.y, M_2PI);
    float d2 = mod((uv.x + uv.y + 0.25) * 1.3, M_6PI);
    d1 = iTime * 0.07 + d1;
    d2 = iTime * 0.5 + d2;
    vec2 dist = vec2(
        sin(d1) * 0.15 + sin(d2) * 0.05,
        cos(d1) * 0.15 + cos(d2) * 0.05
    );
    vec3 ret = mix(WATER_COL, WATER2_COL, waterlayer(uv + dist.xy, foamPhase));

    // --- Blend main and foam colors with a sharper foam mask ---
    float foamMask = waterlayer(vec2(1.0) - uv - dist.yx, foamPhase);
    foamMask = smoothstep(0.3, 0.6, foamMask); // Tweak these for a tighter/softer foam
    ret = mix(ret, FOAM_COL, foamMask);

    return ret;
}

void main()
{
    vec2 uv = outTexCoord;
    vec4 texColor = texture2D(uMainSampler, uv);

    float foamPhase = sin(iTime * 0.25);

    vec3 color = water(uv, foamPhase);

    gl_FragColor = texColor * vec4(color, 1.0);
}
  `;

  class WaterPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
    constructor(game) {
      super({ game, fragShader });
    }
    onRender() {
      this.setTime("iTime");
    }
  }

  var config = {
    type: Phaser.AUTO,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    parent: divName,
    scene: {
      preload: preload,
      create: create,
      update: update,
    },
  };
  sprites = [];

  let game = new Phaser.Game(config);

  let waterPipeline;
  function preload() {
    console.log("preload called!");
    this.load.image("dot", "img/water-particle.png");
    //this.load.image('bg', 'img/bg.png');
    //this.load.image('photo', PICTURE_FILENAME);
    this.load.image("bar", "img/bar.png");
  }

  function create() {
    console.log("create called!");
    if (!this.renderer.pipelines.has("Water")) {
      waterPipeline = this.renderer.pipelines.add(
        "Water",
        new WaterPipeline(game)
      );
    } else {
      waterPipeline = this.renderer.pipelines.get("Water");
    }

    //const image = this.add.image(0,0,'bg').setOrigin(0,0);

    const layer = this.add.layer();
    InitializeRainMaker();
    //let bitmapData = LoadBitmapData(game);
    SetupParticles(this, layer);
    SetupBarSprite(this);
    //SetupGaming(this);
  }

  function update() {
    tick();
    // scoreText.setText("score: " + points);
    if (this.input.activePointer.isDown) moveBar(this);
  }
})("rain");
