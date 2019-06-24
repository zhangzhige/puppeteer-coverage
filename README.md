# puppeteer-coverage

在项目使用自动化测试中，采用的是puppeteer方案，但是在做覆盖率统计时候，puppeteer-to-istanbul无法解析源代码。因为我们项目是经过webpack编译之后的代码。需要对应的将编译后的js还原成源代码，再来统计覆盖率数据。

# 如何使用
 npm install puppeteer-coverage --save-dev

接着你需要在每个自动化测试用例结束前调用
const saveCoverage = require('puppeteer-coverage').saveCoverage;
const path = require('path');
const nyc_output_path = path.resolve('./.nyc_output/');

let jsCoverage = await page.coverage.stopJSCoverage();
saveCoverage(jsCoverage, nyc_output_path);

等所有自动化用例执行结束，需要通过另一个脚本，来生成自动化的覆盖率
output_coverage.js文件：
const pti = require('puppeteer-coverage');
const pathLib = require('path');

(async function() {
  const options = {
    nyc_output_path: pathLib.resolve(__dirname, './.nyc_output/'),
    src_dir: pathLib.resolve(__dirname, '../src'),
    source_map_dir: pathLib.resolve(__dirname, '../dist/js/'),
    url_regexp: /promotion\/res\/htmledition\/js\/(.+\.(js|css))/,
    filterCoverageFile: (path)=>{
      return !(path.includes('/src/js/') &&
        !path.includes('js/common/weixin-third') &&
        !path.includes('/js/common/weixin-ui') &&
        !path.includes('js/lib') &&
        !path.includes('campaign/manage') &&
        !path.includes('common/utils') &&
        !path.includes('rdcanvas') &&
        !path.includes('rdsns') &&
        !path.includes('moments/edit') &&
        !path.includes('campaign/email_edit') &&
        !path.includes('sns_assembly/revert') &&
        !path.includes('common/report') &&
        !path.includes('common/target') &&
        !path.includes('material_std') &&
        !path.includes('.scss') && !path.includes('.css'));
    }
  };
  console.log('options=', options);
  await pti.output(options);
})();

npm脚本：
"output_coverage": "node output_coverage.js && nyc report --reporter=html",
或者
"coverage_summary": "node output_coverage.js && nyc report --reporter=text-summary"