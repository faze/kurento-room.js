const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const concatMap = require('broccoli-sourcemap-concat');
const wrapFiles = require('broccoli-wrap');
const filterCoffeeScript = require('broccoli-coffee');
const uglifyJavaScript = require('broccoli-uglify-js')
const jshintTree = require('broccoli-jshint');
const mergeTrees = require('broccoli-merge-trees');
// const babel = require('broccoli-babel-transpiler');
const pkg = require('./package.json');
const bower_components = 'bower_components';
const src = 'src';

const vendor = funnel(bower_components,{
  files: ['kurento-jsonrpc/js/kurento-jsonrpc.js','adapter.js/adapter.js','eventEmitter/EventEmitter.js','jquery/dist/jquery.js']
})
const indexHtml = funnel(src, {
  files: ['index.html']
});

const coffeeFiles = filterCoffeeScript(src,{
  bare: true
})
// const js = funnel(src, {
//   files: ['index.js','lib/participant.js','lib/room.js','lib/stream.js']
// });
// const js = babel(src, {
//   stage: 0,
//   moduleIds: true,
//   modules: 'amd',
//   // Transforms /index.js files to use their containing directory name
//   getModuleId: function (name) {
//     name = 'kurento-room/' + name;
//     return name.replace(/\/index$/, '');
//   },
//
//   // Fix relative imports inside /index's
//   resolveModuleSource: function (source, filename) {
//     var match = filename.match(/(.+)\/index\.\S+$/i);
//
//     // is this an import inside an /index file?
//     if (match) {
//       var path = match[1];
//       return source
//         .replace(/^\.\//, path + '/')
//         .replace(/^\.\.\//, '');
//     } else {
//       return source;
//     }
//   }
// });
// const appJs = mergeTrees([loaderFile,js]);
const jsHinted = jshintTree(coffeeFiles);
const main = concat(jsHinted, {
  inputFiles: [
    '**/*.js'
  ],
  outputFile: '/kurento-room-without.js'
});
const wrapped = wrapFiles(main,{
  wrapper: ["(function () {\n","if (typeof define === 'function' && define.amd) {\ndefine(function () {\nreturn KurentoRoom;\n});\n} else if (typeof module !== 'undefined' && module.exports) {\n        module.exports = KurentoRoom;     }    else {        this.KurentoRoom = KurentoRoom;    }}.call(this));"]
});

const merged = mergeTrees([vendor,wrapped]);
const final = concatMap(merged, {
  inputFiles: [
    '**/*.js'
  ],
  outputFile: '/kurento-room.js'
});
const uglifiedFinal = uglifyJavaScript(final);

module.exports = mergeTrees([uglifiedFinal, indexHtml]);
