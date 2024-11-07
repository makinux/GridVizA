
// ---------- 設定項目(GraphCastで予測された2023年12月の全球気圧データ) ---------------------------

const modelPath = "./data/sample_graphcast/model_mesh.glb"; // glTFモデルパス

const geotiffUrl = "./data/sample_graphcast/pres_geotiff"; // Geotiffデータ読み込み先（${geotiffUrl}/1.tif、${geotiffUrl}/2.tif、...）
const startDateTime = Date.parse("2023/12/07 06:00:00"); // 再生開始日時
const endDateTime = Date.parse("2023/12/17 03:00:00"); // 再生終了日時
const timeStep = 6; // 時系列データの時間ステップ（hour）

const heightBuf = "10000.0"; // 高さのスケール
const heightOffset = "10000.0"; // 高さのオフセット

const zscale = "1.0"; // 時系列データの値のスケール
const zmin = "947.253515625"; // 時系列データ最小値（zscale適用後の値）
const zmax = "1058.2825"; // 時系列データ最大値（zscale適用後の値）

// --------------------------------------------------------------------------------------------*/

/*// ---------- 設定項目(2023年8月の台風7号の気圧データ) -------------------------------------------

const modelPath = "./data/sample_202308/model_mesh_20230814_20230816.glb"; // glTFモデルパス

const geotiffUrl = "./data/sample_202308/pres_geotiff"; // Geotiffデータ読み込み先（${geotiffUrl}/1.tif、${geotiffUrl}/2.tif、...）
const startDateTime = Date.parse("2023/08/14 00:00:00"); // 再生開始日時
const endDateTime = Date.parse("2023/08/16 23:00:00"); // 再生終了日時
const timeStep = 1; // 時系列データの時間ステップ（hour）

const heightBuf = "10000.0"; // 高さのスケール
const heightOffset = "10000.0"; // 高さのオフセット

const zscale = "0.01"; // 時系列データの値のスケール
const zmin = "966.761484375"; // 時系列データ最小値（zscale適用後の値）
const zmax = "1017.174296875"; // 時系列データ最大値（zscale適用後の値）

// --------------------------------------------------------------------------------------------*/

/*// ---------- 設定項目(2023年8月の台風7号の雨量データ) -------------------------------------------

const modelPath = "./data/sample_202308/model_mesh_20230814_20230816.glb"; // glTFモデルパス

const geotiffUrl = "./data/sample_202308/rain_geotiff"; // Geotiffデータ読み込み先（${geotiffUrl}/1.tif、${geotiffUrl}/2.tif、...）
const startDateTime = Date.parse("2023/08/14 00:00:00"); // 再生開始日時
const endDateTime = Date.parse("2023/08/16 23:00:00"); // 再生終了日時
const timeStep = 1; // 時系列データの時間ステップ（hour）

const heightBuf = "10000.0"; // 高さのスケール
const heightOffset = "10000.0"; // 高さのオフセット

const zscale = "1.0"; // 時系列データの値のスケール
const zmin = "0.0"; // 時系列データ最小値（zscale適用後の値）
const zmax = "100.1223220825"; // 時系列データ最大値（zscale適用後の値）

// --------------------------------------------------------------------------------------------*/


var viewer;
let tileset;
const instances = [];

const position = new Cesium.Cartesian3(0, 0, 0); // glTFモデルの表示位置
const hpr = Cesium.HeadingPitchRoll.fromDegrees(0.0, 90.0, 90.0); // glTFモデルの回転

// 時間のリスト作成
const timeList = [];
for (let targetTime = startDateTime; targetTime <= endDateTime; targetTime += (3600000 * timeStep)) {
  timeList.push(new Date(targetTime));
}
const bandNumber = timeList.length;

// geotiffデータ格納用
const geotiffDataList = {};
// 表示中のgeotiffデータのインデックス
let geotiffDataIdx = 0;
let geotiffDataSize;

let model;
let pointCloudWaveShader;

async function init() {
  $("#RangeMin").val(zmin);
  $("#RangeMax").val(zmax);
  $("#curvatureArg").val(20000);
  $("#slopeArg").val(8000);
  $("#depthTr").val(0.5);
  $("#contourInterval").val(0);
  $("#modelTr").val(1.0);

  viewer = new Cesium.Viewer("cesiumContainer", {
    baseLayerPicker: false,
    baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/"
    }))
  });
  var scene = viewer.scene;
  scene.sunBloom = false; // 太陽を表示しない
  scene.sun.show = false; // 太陽を表示しない
  scene.skyBox.show = false; // 星を表示しない
  scene.moon.show = false;
  scene.shadowMap.enabled = false;
  scene.fog.enabled = false;
  scene.globe.showGroundAtmosphere = false;

  var cesiumClock = viewer.clock;
  cesiumClock.clockRange = Cesium.ClockRange.CLAMPED;
  // タイムライン再生時の動作
  cesiumClock.onTick.addEventListener(animationUpdate);
  // 初期状態ではアニメーションは停止
  cesiumClock.shouldAnimate = false;

  cesiumClock.startTime = Cesium.JulianDate.fromIso8601(
    timeList[0].toISOString()
  );
  cesiumClock.stopTime = Cesium.JulianDate.fromIso8601(
    timeList[timeList.length-1].toISOString()
  );
  viewer.timeline.zoomTo(
    cesiumClock.startTime,
    cesiumClock.stopTime
  );

  cesiumClock.currentTime = Cesium.JulianDate.fromIso8601(
    timeList[0].toISOString()
  );
  
  // geotiff初期読み込み
  console.log("georiff load.");
  await loadGeotiffData();
  geotiffDataSize = {
    width: geotiffDataList[geotiffDataIdx].width,
    height: geotiffDataList[geotiffDataIdx].height
  };

  const rangeMin = Number($("#RangeMin").val());
  const rangeMax = Number($("#RangeMax").val());
  const curvatureArg = Number($("#curvatureArg").val());
  const slopeArg = Number($("#slopeArg").val());
  const depthTr = Number($("#depthTr").val());
  const contourInterval = Number($("#contourInterval").val());

  pointCloudWaveShader = new Cesium.CustomShader({
    uniforms: {
      // elapsed time in seconds for animation
      u_mix: {
        type: Cesium.UniformType.FLOAT,
        value: 0.0,
      },
      u_range: {
        type: Cesium.UniformType.VEC2,
        value: new Cesium.Cartesian2(rangeMin, rangeMax),
      },
      u_argv: {
        type: Cesium.UniformType.VEC4,
        value: new Cesium.Cartesian4(3.0 * curvatureArg, 1.0 * slopeArg, 0.0, 0.0),
      },
      u_depthTr: {
        type: Cesium.UniformType.FLOAT,
        value: depthTr,
      },
      u_contourInterval: {
        type: Cesium.UniformType.FLOAT,
        value: contourInterval,
      },
      u_geotiffTexture_1: {
        type: Cesium.UniformType.SAMPLER_2D,
        value: new Cesium.TextureUniform({
          typedArray: new Float32Array(geotiffDataList[geotiffDataIdx][0]),
          width: geotiffDataSize.width,
          height: geotiffDataSize.height,
          pixelFormat: Cesium.PixelFormat.RED,
          pixelDatatype: Cesium.PixelDatatype.FLOAT,
        }),
      },
      u_geotiffTexture_2: {
        type: Cesium.UniformType.SAMPLER_2D,
        value: new Cesium.TextureUniform({
          typedArray: new Float32Array(geotiffDataList[geotiffDataIdx][0]),
          width: geotiffDataSize.width,
          height: geotiffDataSize.height,
          pixelFormat: Cesium.PixelFormat.RED,
          pixelDatatype: Cesium.PixelDatatype.FLOAT,
        }),
      },
    },
    vertexShaderText: `
      const float a = 6378137.0; // WGS-84 semi-major axis
      const float f = 1.0 / 298.257223563; // WGS-84 flattening
      const float b = a * (1.0 - f); // Semi-minor axis
      const float e_sq = f * (2.0 - f); // Square of eccentricity
      const float M_PI = 3.14159265358979323846;

      float get_tex_value(vec2 uv_pos) {
        float zval_1 = texture(u_geotiffTexture_1, uv_pos)[0];
        float zval_2 = texture(u_geotiffTexture_2, uv_pos)[0];
        return ((zval_1 * (1.0 - u_mix)) + (zval_2 * u_mix)) * ${zscale};
      }

      vec3 geodeticToECEF(float lon, float lat, float height) {
        // Convert degrees to radians
        float lonRad = radians(lon);
        float latRad = radians(lat);
        
        float N = a / sqrt(1.0 - e_sq * pow(sin(latRad), 2.0));
        float x = (N + height) * cos(latRad) * cos(lonRad);
        float y = (N + height) * cos(latRad) * sin(lonRad);
        float z = ((1.0 - e_sq) * N + height) * sin(latRad);
        
        return vec3(x, y, z);
      }

      void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput)
      {
        vec2 lonlat = vsInput.attributes.longlat;

        vec2 geotiff_idx = vsInput.attributes.idx;
        vec2 uv_pos = vec2(float(geotiff_idx.x) / ${geotiffDataSize.width.toFixed(1)}, float(geotiff_idx.y) / ${geotiffDataSize.height.toFixed(1)});
        float zval = get_tex_value(uv_pos);

        float newz = ${heightOffset} + ((zval - ${zmin})  * ${heightBuf});
        vec3 newXyz = geodeticToECEF(lonlat.x, lonlat.y, newz);
        vsOutput.positionMC.x = newXyz.x;
        vsOutput.positionMC.y = newXyz.y;
        vsOutput.positionMC.z = newXyz.z;
        vsOutput.pointSize = 3.0;
      }
      `,
    fragmentShaderText: `
      #define MAX_SCHEME_LENGTH 50

      const float x_unit = 1.0 / ${geotiffDataSize.width.toFixed(1)};
      const float y_unit = 1.0 / ${geotiffDataSize.height.toFixed(1)};
      const vec2 unit = vec2(x_unit, y_unit); // 5

	    const float zoom = 1.0;
	    const int u_n = 11;
	    const vec3[u_n] u_colorScheme = vec3[](
          vec3(1.0, 0.0, 1.0),
          vec3(0.5019607843137255, 0.0, 1.0),
          vec3(0.0, 0.0, 1.0),
          vec3(0.0, 0.5019607843137255, 1.0),
          vec3(0.0, 1.0, 1.0),
          vec3(0.0, 1.0, 0.5019607843137255),
          vec3(0.0, 1.0, 0.0), // 20
          vec3(0.5019607843137255, 1.0, 0.0),
          vec3(1.0, 1.0, 0.0),
          vec3(1.0, 0.5019607843137255, 0.0),
          vec3(1.0, 0.0, 0.0)
        );

      const mat3 conv_c = mat3(vec3(0,-1, 0),vec3(-1, 4,-1), vec3(0,-1, 0));
	    const mat3 conv_sx = mat3(vec3(-1, 0, 1),vec3(-2, 0, 2),vec3(-1, 0, 1));
	    const mat3 conv_sy = mat3(vec3(-1,-2,-1),vec3(0, 0, 0),vec3( 1, 2, 1));
	    const vec3 color_convex  = vec3(1.0,0.5,0.0); // 30
	    const vec3 color_concave = vec3(0.0,0.0,0.5);
	    const vec3 color_flat    = vec3(0.0,0.0,0.0);

      const vec4 rgb2alt = vec4(256 * 256, 256 , 1, 0) * 256.0 * 0.01;

      float get_tex_value(vec2 uv_pos) {
        float zval_1 = texture(u_geotiffTexture_1, uv_pos)[0];
        float zval_2 = texture(u_geotiffTexture_2, uv_pos)[0];
        return ((zval_1 * (1.0 - u_mix)) + (zval_2 * u_mix)) * ${zscale};
      } // 40

      float conv(mat3 a, mat3 b){
        return dot(a[0],b[0]) + dot(a[1],b[1]) + dot(a[2],b[2]);
      }
    
      bool isNan( float val )
      {
        return ( val < 0.0 || 0.0 < val || val == 0.0 ) ? false : true;
      }

      // Use this function because we cannot use dynamic value for array index in GLSL
      vec3 getData(float x) {
        for (int j=0; j<MAX_SCHEME_LENGTH; j++) {
          if (j == int(floor(x))) return u_colorScheme[j];
        }
        return vec3(0.0, 0.0, 0.0);
      }

      // GLSL translation of basis() in d3
      // https://github.com/d3/d3-interpolate/blob/master/src/basis.js
      vec3 basis(float t1, vec3 v0, vec3 v1, vec3 v2, vec3 v3) {
        float t2 = t1 * t1;
        float t3 = t2 * t1;
        return ((1.0 - 3.0 * t1 + 3.0 * t2 - t3) * v0
            + (4.0 - 6.0 * t2 + 3.0 * t3) * v1
            + (1.0 + 3.0 * t1 + 3.0 * t2 - 3.0 * t3) * v2
            + t3 * v3) / 6.0;
      }

      // GLSL translation of exported function in the URL below
      // https://github.com/d3/d3-interpolate/blob/master/src/basis.js
      vec3 getColor(float t) {
        int n = u_n - 1;

        float i    = t <= 0.0 ? 0.0 : (t >= 1.0 ? float(n) - 1.0 : floor(t * float(n)));
        float t2 = t <= 0.0 ? 0.0 : (t >= 1.0 ? 1.0 : t);
        vec3 v1 = getData(i);
        vec3 v2 = getData(i+1.0);
        vec3 v0 = i > 0.0 ? getData(i-1.0) : 2.0 * v1 - v2;
        vec3 v3 = i < float(n) - 1.0 ? getData(i+2.0) : 2.0 * v2 - v1;

        return basis((t2 - i / float(n)) * float(n), v0, v1, v2, v3);
      }
      
      vec3 getData_curvature_color(float x) {
        vec3 curvature_colorScheme[9];
        curvature_colorScheme[0] = vec3(0.20,0.23,0.59);
        curvature_colorScheme[1] = vec3(0.30,0.49,0.72);
        curvature_colorScheme[2] = vec3(0.55,0.76,0.86);
        curvature_colorScheme[3] = vec3(0.82,0.92,0.96);
        curvature_colorScheme[4] = vec3(1.00,1.00,0.76);
        curvature_colorScheme[5] = vec3(1.00,0.82,0.51);
        curvature_colorScheme[6] = vec3(0.97,0.51,0.30);
        curvature_colorScheme[7] = vec3(0.87,0.24,0.18);
        curvature_colorScheme[8] = vec3(0.66,0.00,0.14);
  
        for (int j=0; j<9; j++) {
            if (j == int(floor(x))) return curvature_colorScheme[j];
        }
        return vec3(0.0, 0.0, 0.0);
      }

      vec3 getColor_curvature_color(float t) {
        int n = 9 - 1;

        float i    = t <= 0.0 ? 0.0 : (t >= 1.0 ? float(n) - 1.0 : floor(t * float(n)));
        float t2 = t <= 0.0 ? 0.0 : (t >= 1.0 ? 1.0 : t);
        vec3 v1 = getData_curvature_color(i);
        vec3 v2 = getData_curvature_color(i+1.0);
        vec3 v0 = i > 0.0 ? getData_curvature_color(i-1.0) : 2.0 * v1 - v2;
        vec3 v3 = i < float(n) - 1.0 ? getData_curvature_color(i+2.0) : 2.0 * v2 - v1;

        return basis((t2 - i / float(n)) * float(n), v0, v1, v2, v3);
      }

      vec3 get_cs_map(vec2 uv_pos) {
        mat3 h;
		    h[0][0] = get_tex_value(uv_pos + (vec2(-1,-1) * unit));
		    h[0][1] = get_tex_value(uv_pos + (vec2( 0,-1) * unit));
		    h[0][2] = get_tex_value(uv_pos + (vec2( 1,-1) * unit));
		    h[1][0] = get_tex_value(uv_pos + (vec2(-1, 0) * unit));
		    h[1][1] = get_tex_value(uv_pos + (vec2( 0, 0) * unit));
		    h[1][2] = get_tex_value(uv_pos + (vec2( 1, 0) * unit));
		    h[2][0] = get_tex_value(uv_pos + (vec2(-1, 1) * unit));
		    h[2][1] = get_tex_value(uv_pos + (vec2( 0, 1) * unit));
		    h[2][2] = get_tex_value(uv_pos + (vec2( 1, 1) * unit));
		    float z = 10.0 * exp2(14.0 - zoom);
		    vec2 cs = h[1][1] > 4000.0 ? vec2(0) :
		    	clamp(
		    		vec2(
		    			conv(h,conv_c),
		    			length(
		    				vec2(
		    					conv(h , conv_sx),
		    					conv(h , conv_sy)
		    				)
		    			)
		    		) * vec2(u_argv[0] / z,u_argv[1] / z), -1.0 ,1.0
		    	);
                
		    vec3 curvature_color_1 = cs[0] > 0.0 ? mix(vec3(0.40,0.67,0.84),vec3(1.0,1.0,1.0),cs[0]) : mix(vec3(0.40,0.67,0.84),vec3(0.03,0.20,0.43),-cs[0]);
		    vec3 slope_color_1 = mix(vec3(1.0,1.0,1.0),vec3(0.67,0.23,0.05),cs[1]);
		    vec3 depth_color = vec3((get_tex_value(uv_pos) - u_range[0]) / (u_range[1] - u_range[0]));
		    vec3 rittaizu_color = mix(mix(depth_color, slope_color_1, 0.5), curvature_color_1, 0.5);
                
		    vec3 curvature_color_2 = getColor_curvature_color(cs[0] > 1.0 ? 1.0 : ( cs[0] < -1.0 ? 0.0 : ((cs[0] + 1.0) / 2.0)));
		    vec3 slope_color_2 = mix(vec3(1.0,1.0,1.0),vec3(0.0,0.0,0.0),cs[1]);
		    vec3 kyokurituzu_color = mix(curvature_color_2, slope_color_2, 0.5);
                
		    vec3 color_tmp = mix(rittaizu_color, kyokurituzu_color, 0.5);
		    vec3 color_tmp2 = color_tmp;
                
		    vec3 dem_color = vec3(getColor((get_tex_value(uv_pos) - u_range[0]) / (u_range[1] - u_range[0])) * u_depthTr)+vec3(1.0 - u_depthTr);
                
  	    	vec3 contour = vec3(1,1,1);
  	    	if (u_contourInterval > 0.0) {
  	    	  vec2 range_interval = vec2(floor(u_range[0] / u_contourInterval), floor(u_range[1] / u_contourInterval));
		    	  float h1 = floor(get_tex_value(uv_pos + (vec2( 0, 0) * unit)) / u_contourInterval);
		    	  float h2 = floor(get_tex_value(uv_pos + (vec2( 1, 0) * unit)) / u_contourInterval);
		    	  float h3 = floor(get_tex_value(uv_pos + (vec2( 0, 1) * unit)) / u_contourInterval);
		    	  float h4 = floor(get_tex_value(uv_pos + (vec2( 1, 1) * unit)) / u_contourInterval);
          
  	    	  contour = (h1!=h2 || h1!=h3 || h1!=h4) ? vec3(0.8,0.8,0.8) : vec3(1,1,1);
  	    	}
        
		    return color_tmp2 * dem_color * contour;
      }

      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
      {
        vec2 geotiff_idx = fsInput.attributes.idx;
        vec2 uv_pos = vec2(float(geotiff_idx.x) / ${geotiffDataSize.width.toFixed(1)}, float(geotiff_idx.y) / ${geotiffDataSize.height.toFixed(1)});

        material.diffuse = get_cs_map(uv_pos);
      }
      `,
  });

  const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
    "north",
    "west"
  );

  const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
    position,
    hpr,
    Cesium.Ellipsoid.WGS84,
    fixedFrameTransform
  );

  model = viewer.scene.primitives.add(
    await Cesium.Model.fromGltfAsync({
      url: modelPath,
      customShader: pointCloudWaveShader,
      modelMatrix: modelMatrix,
      backFaceCulling: false,
      color: getColor("White", 1.0),
    })
  );

  const removeListener = model.readyEvent.addEventListener(() => {
    viewer.camera.flyToBoundingSphere(model.boundingSphere, {
      duration: 0.0,
    });

    removeListener();
  });
}

// タイムライン変更時の処理
let onTickPrevTime = null;
async function animationUpdate() {
  let currentTime = Cesium.JulianDate.toDate(viewer.clock.currentTime);
  // onTickイベントが何故か時刻が変化していない場合でも発火するので、前回の時刻を保持しておいて変更があったか確認する
  if (currentTime.getTime() != onTickPrevTime) {
    onTickPrevTime = currentTime.getTime();

    // 対象となるgeotiffデータを確認
    let targetIdxTmp = geotiffDataIdx;
    for (let i = 0; i < timeList.length - 1; i++) {
      if (timeList[i] <= currentTime && timeList[i+1] > currentTime) {
        targetIdxTmp = i;
        break;
      }
    }

    // 表示データの更新がある場合
    if (targetIdxTmp != geotiffDataIdx) {
      geotiffDataIdx = targetIdxTmp;

      if (pointCloudWaveShader) {
        if (geotiffDataList[geotiffDataIdx]) {
            setGeotiffTexture = true;
            pointCloudWaveShader.setUniform("u_geotiffTexture_1", new Cesium.TextureUniform({
              typedArray: new Float32Array(geotiffDataList[geotiffDataIdx][0]),
              width: geotiffDataSize.width,
              height: geotiffDataSize.height,
              pixelFormat: Cesium.PixelFormat.RED,
              pixelDatatype: Cesium.PixelDatatype.FLOAT,
            }));

            pointCloudWaveShader.setUniform("u_geotiffTexture_2", new Cesium.TextureUniform({
              typedArray: new Float32Array(geotiffDataList[geotiffDataIdx+1][0]),
              width: geotiffDataSize.width,
              height: geotiffDataSize.height,
              pixelFormat: Cesium.PixelFormat.RED,
              pixelDatatype: Cesium.PixelDatatype.FLOAT,
            }));

            let mixVal = (currentTime.getTime() - timeList[geotiffDataIdx].getTime()) / (timeList[geotiffDataIdx+1].getTime() - timeList[geotiffDataIdx].getTime());
            pointCloudWaveShader.setUniform("u_mix", mixVal);
        }
      }
      
    } else {
      // 表示割合の更新
      if (pointCloudWaveShader) {
        let mixVal = (currentTime.getTime() - timeList[geotiffDataIdx].getTime()) / (timeList[geotiffDataIdx+1].getTime() - timeList[geotiffDataIdx].getTime());
        pointCloudWaveShader.setUniform("u_mix", mixVal);
      }
    }
  }
}

// geotiff画像読み込み処理
async function loadGeotiffData() {
  // 表示中データの前後3個までのデータを取得
  for (let targetIdx = 0; targetIdx < bandNumber; targetIdx++) {
    if (targetIdx < 0 || targetIdx >= timeList.length) continue;

    if (!geotiffDataList[targetIdx]) {
      let startTime = Date.now();
      let tiff = await GeoTIFF.fromUrl(`${geotiffUrl}/${targetIdx+1}.tif`);
      let image = await tiff.getImage();
      let geotiff_data = await image.readRasters();
      geotiffDataList[targetIdx] = geotiff_data;
      console.log(`loaded ${geotiffUrl}/${targetIdx+1}.tif: ${(Date.now() - startTime) / 1000} s`); 
    }
  }
}

// 色を取得
function getColor(colorName, alpha) {
  const color = Cesium.Color[colorName.toUpperCase()];
  return Cesium.Color.fromAlpha(color, parseFloat(alpha));
}

// 設定を反映
$(document).on("click", "#settingBtn", async function () {
  if (model) {
    const rangeMin = Number($("#RangeMin").val());
    const rangeMax = Number($("#RangeMax").val());
    const curvatureArg = Number($("#curvatureArg").val());
    const slopeArg = Number($("#slopeArg").val());
    const depthTr = Number($("#depthTr").val());
    const contourInterval = Number($("#contourInterval").val());
    const modelTr = Number($("#modelTr").val());

    pointCloudWaveShader.setUniform("u_range", new Cesium.Cartesian2(rangeMin, rangeMax));
    pointCloudWaveShader.setUniform("u_argv", new Cesium.Cartesian4(3.0 * curvatureArg, 1.0 * slopeArg, 0.0, 0.0));
    pointCloudWaveShader.setUniform("u_depthTr", depthTr);
    pointCloudWaveShader.setUniform("u_contourInterval", contourInterval);

    model.color = getColor("White", modelTr);
  }
})

