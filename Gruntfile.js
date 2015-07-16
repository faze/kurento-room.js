module.exports = function(grunt) {
  JS = [
    'bower_components/adapter.js/adapter.js',
    'bower_components/eventEmitter/EventEmitter.js',
    'bower_components/jquery/dist/jquery.js',
    'bower_components/kurento-jsonrpc/js/kurento-jsonrpc.js',
    'bower_components/kurento-jsonrpc/js/kurento-jsonrpc.js'
  ]
  KR = [
    'build/**/*.js'
  ]
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'index.js', 'lib/**/*.js'],
      options: {
        shadow: false,
        globals: {
          jQuery: true
        }
      }
    },
    clean: {
      dist: [
        'dist/kurento*'
      ]
    },
    uglify: {
      basic: {
        files: {
          'dist/kurento-room.min.js': 'dist/kurento-room.js'
        },
        options: {
          // JS source map: to enable, uncomment the lines below and update sourceMappingURL based on your install
          sourceMap: 'dist/kurento-room.min.js.map',
          sourceMappingURL: '/dist/kurento-room.min.js.map'
        }
      },
      dist: {
        files: {
          'dist/kurento-room.full.min.js': 'dist/kurento-room.full.js'
        },
        options: {
          // JS source map: to enable, uncomment the lines below and update sourceMappingURL based on your install
          sourceMap: 'dist/kurento-room.full.min.js.map',
          sourceMappingURL: '/dist/kurento-room.full.min.js.map'
        }
      }
    },
    concat: {
      basic: {
        src: KR,
        dest: 'dist/kurento-room.js',
        options: {
          stripBanners: true,
          separator: '\n',
          banner: '/*!\n<%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n*/\n' +
            '(function() {\n',
          footer: "if (typeof define === 'function' && define.amd) {\n" +
                          'define(function () {\n' +
                          '    return KurentoRoom;\n' +
                          '});\n' +
                      '}\n' +
                      "else if (typeof module !== 'undefined' && module.exports) {\n" +
                          'module.exports = KurentoRoom;\n' +
                      '}\n' +
                      'else {\n' +
                          'this.KurentoRoom = KurentoRoom;\n' +
                      '}\n' +
                  '}.call(this));'
        }
      },
      full: {
        src: JS.concat(['dist/kurento-room.js']),
        dest: 'dist/kurento-room.full.js',
        options: {
          separator: '\n',
          stripBanners: true,
          banner: '/*! <%= pkg.name %> with dependencies - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */'
        }
      }
    },
    coffee: {
      compile: {
        options: {
          bare: true
        },
        files: [
          {
            expand: true,
            cwd: "src/",
            src: ['{,**/}*.coffee'],
            dest: './build',
            ext: '.js'
          }
        ]
      }
    },
    watch: {
      coffee: {
        files: [
          'src/{,**/}*.coffee'
        ],
        tasks: ['coffee']
      },
      jshint: {
        files: ['<%= jshint.files %>'],
        tasks: ['jshint']
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', [
      'clean',
      'coffee',
      'concat:basic',
      'concat:full',
      'uglify'
    ]);
    grunt.registerTask('dev', [
      'clean',
      'coffee',
      'concat',
      'watch'
    ]);
};
