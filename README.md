# 時系列データの3Dアニメーション
時系列データを3D地球儀ライブラリCesiumを使用して3Dアニメーションすることで可視化するアプリケーションになります。

動作方法は以下をご覧ください。

## 前準備
使用するデータの準備及び設定を行います。なおサンプルとして以下の2種の準備済みデータを同梱しております。
- `htdocs/data/sample_graphcast`：気象予測AIモデル[GraphCast](https://deepmind.google/discover/blog/graphcast-ai-model-for-faster-and-more-accurate-global-weather-forecasting/)で予測された2023年12月の全球時系列気圧データ
- `htdocs/data/sample_202308`：2023年8月の台風7号の時系列気圧、雨量データ（元データは[京都大学の生存圏データベースで公開している気象庁データ](https://database.rish.kyoto-u.ac.jp/arch/jmadata/gpv-netcdf.html)から取得）

### 時系列Geotiffデータ
アニメーションさせる時系列データのGeotiffを用意します。

Geotiffの形式は以下を想定しております。
  - 拡張子：.tif
  - バンド数：1
  - 空間座標系：WGS84（EPSG:4326）
  - データタイプ：64bit浮動小数点（Float64）

上記形式のGeotiffを時系列の時点数分ディレクトリに格納し、`htdocs/data/`に設置します。
ファイル名は時系列順に1からの連番で設定します。（例：1.tif, 2.tif, 3.tif, ... ,40.tif）

サンプルデータについては以下のディレクトリに時系列データのGeotiffを格納しています。
- `htdocs/data/sample_graphcast/pres_geotiff`（気圧データ）
- `htdocs/data/sample_202308/pres_geotiff`（気圧データ）
- `htdocs/data/sample_202308/rain_geotiff`（雨量データ）

### glTFモデル作成
Cesium上に表示してアニメーションさせる点群またはメッシュのglTFモデルを作成します。

任意の時系列Geotiffデータを使用する場合、`src`ディレクトリに格納されているPythonスクリプトを使用してGeotiffからglTFモデルを作成します。

Pythonが使用できる環境でスクリプトの動作に必要なライブラリをインストールします。
```
pip install numpy pyproj pygltflib open3d
```

以下のコマンドでglTFモデルを生成します。

- 点群モデル
  ```
  python src/geotiff2gltfPointCloud.py htdocs/data/{Geotiffを格納しているディレクトリ}/1.tif htdocs/data/{出力glTFモデル名}.glb
  ```

- メッシュモデル
  ```
  python src/geotiff2gltfMesh.py htdocs/data/{Geotiffを格納しているディレクトリ}/1.tif htdocs/data/{出力glTFモデル名}.glb
  ```
作成したglTFモデルを`htdocs/data/`に設置します。

サンプルデータについては以下のglTFモデルが付属しています。
- `htdocs/data/sample_graphcast/model_pointcloud.glb`（点群モデル）
- `htdocs/data/sample_graphcast/model_mesh.glb`（メッシュモデル）
- `htdocs/data/sample_202308/model_mesh_20230814_20230816.glb`（メッシュモデル）


### 設定
`htdocs/js/main.js`の設定項目を設定します。
以下の項目を設定します。

```
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

// --------------------------------------------------------------------------------------------


...
```

`htdocs/js/main.js`にサンプルデータの設定を記載していますので、サンプルデータで実行する場合はそちらを使用してください。


## 実行手順
1. `htdocs`ディレクトリをWebサーバーに設置します。Dockerが使用できる環境の場合は`docker`ディレクトリ内で`docker compose up`を実行することでアプリを実行するWebサーバーを立ち上げることができます。

1. Webサーバーのアドレスにアクセスしアプリのページを開くとCesiumの画面が表示されます。Dockerでアプリを立ち上げた場合は http://localhost にアクセスします。

1. ページが開いた時点で時系列データの読み込みが実行されるのでしばらく待ちます。読み込みが完了すると点群またはメッシュのglTFモデルが表示されます。

1. 画面下部の時系列スライダーで再生を実行するとアニメーションが開始します。

1. 画面左上の設定UIから表示設定を変更することが可能です。設定項目を入力して「適用」ボタンをクリックすることでglTFモデルの表示に反映されます。

   設定項目は以下の通りです。
   - 最小値：時系列データの最小値です。カラーマップの色分け範囲が変更されます。
   - 最大値：時系列データの最大値です。カラーマップの色分け範囲が変更されます。
   - 曲率係数：CS立体図の曲率計算時の係数です。値を大きくするとCS立体図が強調されます。
   - 傾斜角係数：CS立体図の傾斜角計算時の係数です。値を大きくするとCS立体図が強調されます。
   - カラーマップ透過度：カラーマップの透過度を設定します。
   - 等高線間隔：等高線の間隔を設定します。0の場合は非表示となります。
   - モデル透過度：glTFモデルの透過度を設定します。


