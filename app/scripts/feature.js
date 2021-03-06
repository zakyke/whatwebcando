(function (global) {
  'use strict';

  class FeatureTestResult {
    constructor(passed, property, standard = true, prefix = '') {
      this.passed = passed;
      this.property = property;
      this.standard = standard;
      this.prefix = prefix;
    }

    get message() {
      if (!this.standard) {
        return this.passed ? 'Supported with non-standard solution' : 'Non-standard solution not supported';
      }
      if (!this.passed) {
        return 'Not supported';
      }
      return this.prefix ? 'Prefixed' : 'Supported';
    }

    static forPassed(property, standard, prefix) {
      return new FeatureTestResult(true, property, standard, prefix);
    }

    static forFailed(property, standard) {
      return new FeatureTestResult(false, property, standard);
    }
  }

  class FeatureRawTest {
    constructor(containerName, property, test, standard = true) {
      this.containerName = containerName;
      this.property = property;
      this.test = test;
      this.standard = standard;
    }

    get result() {
      return (this.test() ? FeatureTestResult.forPassed : FeatureTestResult.forFailed)(this.property, this.standard);
    }
  }

  class FeatureInContainerTest {
    constructor(containerName, container, property, standard = true) {
      this.containerName = containerName;
      this.property = property;
      this.standard = standard;

      Object.defineProperties(this, {
        $container: {
          value: container,
          enumerable: false
        }
      });
    }

    $capitalizeFirst(str) {
      return str.substr(0, 1).toUpperCase() + str.substr(1);
    }

    get result() {
      let container = this.$container;
      let property = this.property;

      if (!container) {
        return FeatureTestResult.forFailed(property, this.standard);
      }

      if (property in container) {
        return FeatureTestResult.forPassed(property, this.standard);
      }

      let capitalizedProperty = this.$capitalizeFirst(property);
      for (let prefix of ['moz', 'webkit', 'ms']) {
        if (prefix + property in container) {
          return FeatureTestResult.forPassed(property, this.standard, prefix);
        }
        if (prefix + capitalizedProperty in container) {
          return FeatureTestResult.forPassed(capitalizedProperty, this.standard, prefix);
        }
        let capitalizedPrefix = this.$capitalizeFirst(prefix);
        if (capitalizedPrefix + capitalizedProperty in container) {
          return FeatureTestResult.forPassed(capitalizedProperty, this.standard, capitalizedPrefix);
        }
      }

      return FeatureTestResult.forFailed(property, this.standard);
    }
  }

  class Feature {
    constructor({ id, name, description = [], api = undefined, tests = [], demoPen = undefined, links = [], caniuse = undefined }) {
      this.id = id;
      this.name = name;
      this.description = typeof description === 'string' ? [description] : description;
      this.api = api;
      this.caniuseKey = caniuse;
      this.tests = tests;
      this.demoPen = demoPen;
      this.links = links;
    }

    get supported() {
      if (!this.tests.length) {
        return undefined;
      }

      return !!this.tests.find(x => x.result.passed);
    }

    get notSupported() {
      return this.supported === false;
    }
  }

  Feature.containedIn = (containerName, container, property, standard) =>
    new FeatureInContainerTest(containerName, container, property, standard);

  Feature.navigatorContains = (property, standard) => Feature.containedIn('navigator', global.navigator, property, standard);
  Feature.windowContains = (property, standard) => Feature.containedIn('window', global, property, standard);

  Feature.rawTest = (containerName, property, test) => new FeatureRawTest(containerName, property, test);

  global.WWCD.Feature = Feature;

})(function () {
  let global = typeof exports === 'object' ? exports : window;
  global.WWCD = global.WWCD || {};
  return global;
}());
