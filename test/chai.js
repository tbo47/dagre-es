import chai from 'chai';

chai.config.includeStack = true;

/*
 * Fix Chai"s `notProperty` which passes when an object has a property but its
 * value is undefined.
 */
chai.assert.notProperty = function (obj, prop) {
  // @ts-expect-error
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0760f0d3eb0bc8abd40acc8daf3b95418022ed97/types/chai/index.d.ts#L1110
  // should project be `T extends object`
  chai.assert(!(prop in obj), 'Found prop ' + prop + ' in ' + obj + ' with value ' + obj[prop]);
};

export default chai;
