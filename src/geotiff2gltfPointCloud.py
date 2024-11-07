# -*- coding: utf-8 -*

# pip install numpy pygltflib

from osgeo import gdal
import numpy as np
import pymap3d as pm
import pygltflib

from argparse import ArgumentParser

parser = ArgumentParser()
parser.add_argument('geotiff_filename')
parser.add_argument('gltf_filename')

args = parser.parse_args()

# geotiff画像から緯度経度の配列を取得
def get_lonlat_from_geotiff(ds):
  Xsize = ds.RasterXSize
  Ysize = ds.RasterYSize

  x_min, x_res, rtn_x, y_max, rtn_y, y_res = ds.GetGeoTransform()

  x_max = x_min + Xsize * x_res
  y_min = y_max + Ysize * y_res

  lon_tick = np.arange( x_min, x_max, x_res )
  lat_tick = np.arange( y_max, y_min, y_res )

  return lon_tick, lat_tick

def xyz_to_ecef(lon, lat, alt):
  # WGS84座標をECEF座標に変換
  x, y, z = pm.geodetic2ecef(lat, lon, alt)
  return x, y, z

def create_gltf(points, lonlat_list, idx_list, filename):
  points_binary_blob = points.tobytes()
  lonlat_data_blob = lonlat_list.tobytes()
  idx_data_blob = idx_list.tobytes()

  gltf = pygltflib.GLTF2(
    scene=0,
    scenes=[pygltflib.Scene(nodes=[0])],
    nodes=[pygltflib.Node(mesh=0)],
    meshes=[
        pygltflib.Mesh(
            primitives=[
                pygltflib.Primitive(
                    attributes=pygltflib.Attributes(POSITION=0, _LONGLAT=1, _IDX=2), mode=0
                )
            ]
        )
    ],
    accessors=[
      pygltflib.Accessor(
        bufferView=0,
        componentType=pygltflib.FLOAT,
        count=len(points),
        type=pygltflib.VEC3,
        max=points.max(axis=0).tolist(),
        min=points.min(axis=0).tolist(),
      ),
      pygltflib.Accessor(
        bufferView=1,
        componentType=pygltflib.FLOAT,
        count=len(lonlat_list),
        type=pygltflib.VEC2,
        max=lonlat_list.max(axis=0).tolist(),
        min=lonlat_list.min(axis=0).tolist(),
      ),
      pygltflib.Accessor(
        bufferView=2,
        componentType=pygltflib.UNSIGNED_INT,
        count=len(idx_list),
        type=pygltflib.VEC2,
        max=idx_list.max(axis=0).tolist(),
        min=idx_list.min(axis=0).tolist(),
      ),
    ],
    bufferViews=[
      pygltflib.BufferView(
        buffer=0,
        byteOffset=0,
        byteLength=len(points_binary_blob),
        target=pygltflib.ARRAY_BUFFER,
      ),
      pygltflib.BufferView(
        buffer=0,
        byteOffset=len(points_binary_blob),
        byteLength=len(lonlat_data_blob),
        target=pygltflib.ARRAY_BUFFER,
      ),
      pygltflib.BufferView(
        buffer=0,
        byteOffset=len(points_binary_blob)+len(lonlat_data_blob),
        byteLength=len(idx_data_blob),
        target=pygltflib.ARRAY_BUFFER,
      ),
    ],
    buffers=[
      pygltflib.Buffer(
          byteLength=len(points_binary_blob) + len(lonlat_data_blob) + len(idx_data_blob)
      )
    ],
  )
  gltf.set_binary_blob(points_binary_blob + lonlat_data_blob + idx_data_blob)

  gltf.save(filename)

# geotiff読み込み
ds = gdal.Open(args.geotiff_filename, gdal.GA_ReadOnly)
geotiff_data = np.array([ds.GetRasterBand(i + 1).ReadAsArray() for i in range(ds.RasterCount)])
print(geotiff_data.shape)

# 緯度経度の配列
lon_list, lat_list = get_lonlat_from_geotiff(ds)

# 点群データ作成
idx_list = []
lonlat_list = []
points_ecef_tmp = []
for lon_idx, lon in enumerate(lon_list):
  for lat_idx, lat in enumerate(lat_list):
    points_ecef_tmp.append(xyz_to_ecef(lon, lat, 1000.0))
    idx_list.append([lon_idx, lat_idx])
    lonlat_list.append([lon, lat])

points_ecef = np.array(points_ecef_tmp, dtype=np.float32)

# GLTFファイルを作成
create_gltf(points_ecef, np.array(lonlat_list, dtype=np.float32), np.array(idx_list, dtype=np.uint32), args.gltf_filename)

print("done")