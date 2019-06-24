const fs = require('fs');
const mkdirp = require('mkdirp');
const pathLib = require('path');

const storagePath = '../../../.nyc_output/temp_coverage';

function hash(text) {
  let hash = 5381, index = text.length;
  while (index) {
    hash = (hash * 33) ^ text.charCodeAt(--index)
  }
  return hash >>> 0
}

function rewritePath(path) {
  const filePath = 'temp_' + hash(path);
  mkdirp.sync(storagePath);
  const parsedPath = pathLib.resolve(__dirname, storagePath, filePath);
  return parsedPath
}

function saveCoverage(coverageInfo) {
  coverageInfo.forEach((item) => {
    let parsedPath = rewritePath(item.url);
    const rangeFilePath = parsedPath + '/range/' + new Date().getTime() + Math.floor(Math.random() * 10000);
    console.log('parsedPath=', parsedPath, rangeFilePath);

    if (fs.existsSync(parsedPath)) {
      fs.writeFileSync(rangeFilePath, JSON.stringify(item.ranges), 'utf8')
    } else {
      mkdirp.sync(parsedPath);
      fs.writeFileSync(parsedPath + '/text', item.text, 'utf8');
      fs.writeFileSync(parsedPath + '/url', item.url, 'utf8');
      mkdirp.sync(parsedPath + '/range/');
      fs.writeFileSync(rangeFilePath, JSON.stringify(item.ranges), 'utf8')
    }
  })
}

/**
 * 有序的二分查找，返回-1或存在的数组下标。不使用递归实现。
 * @param target
 * @param ranges_array
 * @returns {*}
 */
function binarySearch(target, ranges_array) {
  let start = 0;
  let end = ranges_array.length - 1;

  while (start <= end) {
    let mid = parseInt(start + (end - start) / 2);
    const array_item = ranges_array[mid];
    if (target.start === array_item.start && target.end === array_item.end) {
      return mid
    } else if (target.start > array_item.end) {
      start = mid + 1
    } else if (target.end < array_item.start) {
      end = mid - 1
    } else {
      if (target.start <= array_item.end && target.end > array_item.end) {
        array_item.end = target.end;
        return mid
      } else if (target.end >= array_item.start && target.start < array_item.start) {
        array_item.start = target.start;
        return mid
      }
      break
    }
  }
  return -1
}

async function loadAllCoverage(options) {
  const temp_path = pathLib.resolve(options.nyc_output_path, 'temp_coverage');
  console.log('temp_path=', temp_path);

  var files = fs.readdirSync(temp_path);
  const allCoverage = [];
  await Promise.all(files.map(async (filename) => {
        console.log('filename=', filename);
        let url, ranges = [], text;
        url = fs.readFileSync(temp_path + '/' + filename + '/url', 'utf8');
        text = fs.readFileSync(temp_path + '/' + filename + '/text', 'utf8');
        let sourceMapUrl = url + '.map';

        fs.readdirSync(temp_path + '/' + filename + '/range').forEach(sub_file => {
          const temp_range = JSON.parse(fs.readFileSync(temp_path + '/' + filename + '/range/' + sub_file, 'utf8'));
          temp_range.forEach(range_item => {
            const index = binarySearch(range_item, ranges);
            if (index === -1) {
              ranges.push(range_item)
            }
          })
        });

        let formatRangeMap = {};
        let formatRangeArray = [];

        ranges.forEach(item => {
          let temp = formatRangeMap[item.start];
          if (temp) {//判断是否已经有对应的start位置。如果有，说明覆盖率数据是重合的。
            formatRangeMap[item.start] = {start: item.start, end: Math.max(item.end, temp.end)}
          } else {
            formatRangeMap[item.start] = item
          }
        });

        const sortKeys = Object.keys(formatRangeMap).sort((a, b) => a - b);//从小到大排序
        sortKeys.forEach(key => {
          const target = formatRangeMap[key];//这里因为key值是从小到大排序的。所以新的target的start值是绝对大于等于formatRangeArray[length-1]的start的。所以只用判断最后一个
          if (formatRangeArray.length > 0) {
            const end_array = formatRangeArray[formatRangeArray.length - 1];
            if (target.start <= end_array.end) {
              end_array.end = Math.max(end_array.end, target.end)
            } else {
              formatRangeArray.push(target)
            }
          } else {
            formatRangeArray.push(target)
          }
        });
        console.log('ranges=', ranges.length, formatRangeArray.length);

        const loadSourceMap = () => {
          return new Promise(resolve => {
            if (options.url_regexp.test(url)) {
              const module_path = RegExp.$1;
              const file_path = pathLib.resolve(options.source_map_dir, module_path + '.map');
              console.log('module_path=', module_path);
              fs.readFile(file_path, 'utf8', function (err, data) {
                if (err) {
                  resolve(null)
                } else {
                  resolve(data)
                }
              })
            } else {
              resolve(null)
            }
          })
        };
        const sourceMap = await loadSourceMap();
        const sourceMapObject = JSON.parse(sourceMap);
        if (sourceMapObject) {
          sourceMapObject.sources = sourceMapObject.sources.map(url => {
            console.log('src_dir=', url.replace('webpack:///./src', options.src_dir));
            return url.replace('webpack:///./src', options.src_dir)
          })
        }
        allCoverage.push({url, ranges: formatRangeArray, text, sourceMapUrl, sourceMap: JSON.stringify(sourceMapObject)})
      })
  );

  return allCoverage
}

module.exports = {
  saveCoverage,
  loadAllCoverage
};
