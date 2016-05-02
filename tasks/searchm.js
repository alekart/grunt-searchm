/*
 * grunt-searchm
 * https://github.com/alekart/grunt-searchm
 *
 * Search and log into json with multiline support
 *
 * Copyright (c) 2016 Aleksei Polechin
 * Licensed under the MIT license.
 */

"use strict";

module.exports = function (grunt) {

	grunt.registerMultiTask("searchm",
		"Grunt plugin, searches a string/regex in a list of files and log it in json file",
		function () {

			// merge task-specific and/or target-specific options with these defaults
			var options = this.options({
				search: null,
				dest: null,
				failOnMatch: false,
				beforeSearch: null,
				onComplete: null
			});

			if (options.search === null) {
				grunt.log.error("Search pattern undefined.\nSkipping");
				return;
			}

			// object that will be filled with found matches and written to the json file
			var report = {
				numResults: 0,
				creationDate: grunt.template.today("yyyy-mm-dd hh:MM:ss"),
				results: {}
			};

			/**
			 * Search pattern in the given text and return an object with matches
			 * @param contents {string} the source text to search in
			 * @param query {string/RegExp} the search pattern or text
			 * @param file {string} fileName or path to show in the object where the match fas found
			 * @returns {*}
			 */
			var find = function (contents, query, file) {
				// Create a regex for the query if it's not one already
				var regex = query instanceof RegExp ? query : new RegExp(query, 'g');
				// For performance, make sure the contents actual contain the pattern
				// before we parse them.
				if (typeof options.beforeSearch === "function") {
					contents = options.beforeSearch(contents);
				}
				if (!regex.test(contents)) {
					return null;
				} else {
					// regex.test advances the search index, so we need to reset it
					regex.lastIndex = 0;
					var match;
					var matches = [];
					// Iterate over the matches
					while ((match = regex.exec(contents)) !== null) {
						// and construct an object of the matches that includes
						// line and the string that matches, as well as the file
						// name if there is one.
						var matchObj = {
							line: contents.substring(0, match.index).split('\n').length,
							match: match[0]
						};

						if (file) {
							matchObj.file = file;
						}
						matches.push(matchObj);
					}
					return matches;
				}
			};

			// count number of items in an object
			var countObejcts = function (a) {
				var count = 0;
				for (var key in a) {
					if (a.hasOwnProperty(key)) {
						count++;
					}
				}
				return count;
			};

			// proceed the search in all provided files
			this.files.forEach(function (file) {
				file.src.filter(function (filepath) {
					if (!grunt.file.isDir(filepath) && grunt.file.exists(filepath)) {

						var content = grunt.file.read(filepath),
							matches = find(content, options.search);

						if (matches) {
							report.results[filepath] = matches;
							report.numResults += countObejcts(matches);
						}

					} else {
						if (!grunt.file.isDir(filepath))
							grunt.log.warn(filepath + ' is a folder.');
						else
							grunt.log.warn('Source file "' + filepath + '" not found.');
					}
				});
			});

			// if dest file is not provided create search-log.json in the ./ folder
			var output = !options.dest ? 'search-log.json' : options.dest;
			grunt.file.write(output, JSON.stringify(report, null, '\t'));

			// interrupt grunt execution if search has results
			if (options.failOnMatch && report.numResults > 0) {
				grunt.fail.warn("Search matches: " + report.numResults + '\n' +
					'Fail on match is enabled.');
			}

			if (typeof options.onComplete === "function") {
				options.onComplete({numMatches: report.numResults, matches: report});
			}

			grunt.log.writeln("Search matches: " + report.numResults);
		});
};
