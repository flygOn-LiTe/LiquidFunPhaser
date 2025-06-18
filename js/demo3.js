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
const bowlWidth = 95; // px (from your JSON)
const bowlHeight = 62; // px

var sprites;
var world;
var barBody;
var barSprite;
var points;
var scoreText;

var meterToPixel = (mx) => mx * METER;
var pixelToMeter = (px) => px / METER;

function createParticleGroup() {
  if (typeof b2ParticleSystemDef === "undefined") {
    console.error(
      "b2ParticleSystemDef is not defined! LiquidFun is not loaded yet!"
    );
    return;
  }

  // Find the bowl position and width/height (centered)
  const bowlX = WINDOW_WIDTH / 2; // match SetupBowlSprite()
  const bowlY = WINDOW_HEIGHT / 1.07;
  const spawnBoxWidth = bowlWidth * 0.95; // Wider, nearly as wide as the bowl
  const spawnBoxHeight = 300;

  // Position the water just above the bowl (pixels)
  const waterBoxCenterX = bowlX;
  const waterBoxCenterY = bowlY - bowlHeight / 2 - spawnBoxHeight / 2 - 4; // 4px gap

  // Convert to meters
  const boxCenter = new b2Vec2(
    pixelToMeter(waterBoxCenterX),
    pixelToMeter(waterBoxCenterY)
  );
  const boxHalfW = pixelToMeter(spawnBoxWidth / 2);
  const boxHalfH = pixelToMeter(spawnBoxHeight / 2);

  // Set up the particle system
  var psd = new b2ParticleSystemDef();
  psd.radius = 0.03;
  psd.dampingStrength = 0.1;
  var particleSystem = world.CreateParticleSystem(psd);

  // Make a small box for the spawn area
  var box = new b2PolygonShape();
  box.SetAsBoxXYCenterAngle(boxHalfW, boxHalfH, boxCenter, 0);

  var particleGroupDef = new b2ParticleGroupDef();
  particleGroupDef.shape = box;
  particleGroupDef.flags = b2_waterParticle;
  particleSystem.CreateParticleGroup(particleGroupDef);
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

function getBowlArcVertices(
  centerX,
  centerY,
  radius,
  startAngle,
  endAngle,
  steps
) {
  let points = [];
  for (let i = 0; i <= steps; i++) {
    let angle = startAngle + (endAngle - startAngle) * (i / steps);
    let x = centerX + Math.cos(angle) * radius;
    let y = centerY + Math.sin(angle) * radius; // y axis points down in screen space
    points.push(new b2Vec2(x, y));
  }
  return points;
}

function createBowlBody(world, x_px, y_px, width_px, height_px) {
  // Convert to meters
  const x = pixelToMeter(x_px);
  const y = pixelToMeter(y_px);

  const widthTweak = 0.9; // try 0.75 to 0.82 until it fits visually
  const w = (pixelToMeter(width_px) / 2) * widthTweak;
  const h = pixelToMeter(height_px) / 2;
  const thickness = pixelToMeter(6);

  const wallHeight = h * 4;
  const bottomOffsetY = (h - thickness) * 0.9;

  // Create a static body for the bowl
  let bowlDef = new b2BodyDef();
  bowlDef.type = b2_staticBody;
  bowlDef.position.Set(x, y);
  let bowlBody = world.CreateBody(bowlDef);

  // Left wall (vertical)
  let leftWall = new b2PolygonShape();
  leftWall.SetAsBoxXYCenterAngle(
    thickness,
    wallHeight,
    new b2Vec2(-w + thickness, 0),
    0
  );
  bowlBody.CreateFixtureFromShape(leftWall, 0);

  // Right wall (vertical)
  let rightWall = new b2PolygonShape();
  rightWall.SetAsBoxXYCenterAngle(
    thickness,
    wallHeight,
    new b2Vec2(w - thickness, 0),
    0
  );
  bowlBody.CreateFixtureFromShape(rightWall, 0);

  // Bottom (horizontal)
  let bottom = new b2PolygonShape();
  bottom.SetAsBoxXYCenterAngle(
    w - thickness,
    thickness,
    new b2Vec2(0, bottomOffsetY), // shifted up a bit
    0
  );
  bowlBody.CreateFixtureFromShape(bottom, 0);

  return bowlBody;
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

function SetupBowlSprite(scene) {
  var bowlSprite = scene.add.sprite(
    scene.cameras.main.width / 2,
    scene.cameras.main.height / 1.23,
    "bowl"
  );
  bowlSprite.setOrigin(0.5, 0.5);
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
    transparent: true,
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
    this.load.image("dot", "img/water-particle-2.png");
    //this.load.image('bg', 'img/bg.png');
    //this.load.image('photo', PICTURE_FILENAME);
    this.load.image("bar", "img/bar.png");
    this.load.image("bowl", "img/water-glass.png");
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

    const layer = this.add.layer();
    InitializeRainMaker();

    SetupParticles(this, layer);
    SetupBarSprite(this);
    SetupBowlSprite(this);

    const bowlSpriteX = this.cameras.main.width / 2;
    const bowlSpriteY = this.cameras.main.height / 1.07;

    createBowlBody(world, bowlSpriteX, bowlSpriteY, bowlWidth, bowlHeight);
  }

  function update() {
    tick();
    if (this.input.activePointer.isDown) moveBar(this);
  }
})("rain");
