import proxyquire from 'proxyquire';
import { should } from "chai";
import sinon from 'sinon';
should();

const propertyMapperMock = {
  name: (value) => (`${value} my-name`),
  photo: (value) => (`${value} photo-value`),
};

describe('Scraper class', () => {
  let myClass;
  const chtmlStub = sinon.stub();
  const loggerStub = sinon.stub();

  const testStub = sinon.stub();
  testStub.returns('hello');
  let transformToFinalModelSpy;

  before(() => {
    myClass = proxyquire.noCallThru().load('./Scraper', {
      '../recipeModelBuilder': (param) => param,
      '../propertyMapper': propertyMapperMock,
      '../logger': loggerStub,
    }).default;

    transformToFinalModelSpy = sinon.spy(myClass.prototype, 'transformToFinalModel');
  });

  describe('constructor with a valid class', () => {
    let scraper;

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() { }
        findRecipeItem() { }
      }

      scraper = new mockClass(chtmlStub);
    });

    it('should set the initial values', () => {
      scraper.chtml.should.eql(chtmlStub);
      (scraper.meta === null).should.be.true;
      (scraper.recipeItem === null).should.be.true;
    });
  });

  describe('constructor for a class missing testForMetadata', () => {
    let scraper;
    let error = '';

    before(async () => {
      class mockClass extends myClass {
        findRecipeItem() { }
      }

      try {
        scraper = new mockClass(chtmlStub);
      } catch (e) {
        error = e;
      }
    });

    it('should throw an error', () => {
      error.should.eql({ message: 'testForMetadata function must be implemented by child class' });
    })
  });

  describe('constructor for a class missing findRecipeItem', () => {
    let scraper;
    let error = '';

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() { }
      }

      try {
        scraper = new mockClass(chtmlStub);
      } catch (e) {
        error = e;
      }
    });

    it('should throw an error', () => {
      error.should.eql({ message: 'findRecipeItem function must be implemented by child class' });
    })
  });

  describe('getRecipe', () => {
    let scraper;

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() {
          this.meta = 'something';
        }

        findRecipeItem() {
          this.recipeItem = {
            hi: 'food n stuff',
          };
        }
      }

      scraper = new mockClass(chtmlStub);
      scraper.getRecipe();
    });

    after(() => {
      transformToFinalModelSpy.resetHistory();
    })

    it('testForMetadata should set the meta', () => {
      scraper.meta.should.eql('something');
    });

    it('findRecipeItem should set the recipeItem', () => {
      scraper.recipeItem.should.eql({ hi: 'food n stuff' });
    });

    it('transformToFinalModelSpy should be invoked', () => {
      sinon.assert.calledOnce(transformToFinalModelSpy);
    });
  });

  describe('transformToFinalModel', () => {
    let scraper;

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() {}
        findRecipeItem() {}
      }

      scraper = new mockClass(chtmlStub);
      scraper.recipeItem = {
        name: 'eat my food',
        photo: 'take my pic',
        forget: 'me,'
      };
      scraper.transformToFinalModel();
    });

    it('finalRecipe should be mapped from the recipeItem', () => {
      scraper.finalRecipe.should.eql({
        name: 'eat my food my-name',
        photo: 'take my pic photo-value',
      });
    });
  });

  describe('getRecipe where no meta has been set', () => {
    let scraper;
    let error;

    before(async () => {
      transformToFinalModelSpy.resetHistory();
      class mockClass extends myClass {
        constructor(chtml) {
          super(chtml);
          this.type = 'tester';
        }

        testForMetadata() {
          // this.meta is null
        }

        findRecipeItem() {
          this.recipeItem = {
            hi: 'food n stuff',
          };
        }
      }

      scraper = new mockClass(chtmlStub);

      try {
        scraper.getRecipe();
      } catch (e) {
        error = e;
      }
    });

    it('no meta error should be thrown', () => {
      error.should.eql({
        message: 'no meta data was found',
        type: 'tester',
      });
    });

    it('meta should not be set', () => {
      (scraper.meta === null).should.be.true;
    });

    it('recipeItem should not be set', () => {
      (scraper.recipeItem === null).should.be.true;
    });

    it('transformToFinalModelSpy should not be called', () => {
      sinon.assert.notCalled(transformToFinalModelSpy);
    });
  });

  describe('getRecipe where no recipeItem has been set', () => {
    let scraper;
    let error;

    before(async () => {
      transformToFinalModelSpy.resetHistory();
      class mockClass extends myClass {
        constructor(chtml) {
          super(chtml);
          this.type = 'tester-2';
        }

        testForMetadata() {
          this.meta = 'something-meta';
        }

        findRecipeItem() {}
      }

      scraper = new mockClass(chtmlStub);

      try {
        scraper.getRecipe();
      } catch (e) {
        error = e;
      }
    });

    it('no meta error should be thrown', () => {
      error.should.eql({
        message: 'found metadata, but no recipe information',
        type: 'tester-2',
      });
    });

    it('meta should be set', () => {
      scraper.meta.should.eql('something-meta');
    });

    it('recipeItem should not be set', () => {
      (scraper.recipeItem === null).should.be.true;
    });

    it('no recipeItem error should be thrown', () => {
      error.should.eql({
        message: 'found metadata, but no recipe information',
        type: 'tester-2',
      });
    });

    it('transformToFinalModelSpy should not be called', () => {
      sinon.assert.notCalled(transformToFinalModelSpy);
    });
  });

  describe('print()', () => {
    let scraper;

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() {}
        findRecipeItem() {}
      }

      scraper = new mockClass(chtmlStub);
      scraper.recipeItem = {
        name: 'eat my food',
        forget: 'me,'
      };
      scraper.finalRecipe = {
        name: 'eat my food my-name',
      };
      scraper.print();
    });

    it('loggerStub should be invoked with the recipeItem if set', () => {
      sinon.assert.calledWith(loggerStub, scraper.recipeItem);
    });

    it('loggerStub should be invoked with the finalRecipe if set', () => {
      sinon.assert.calledWith(loggerStub, scraper.finalRecipe);
    });
  });

  describe('print() when nothing is set', () => {
    let scraper;

    before(async () => {
      class mockClass extends myClass {
        testForMetadata() {}
        findRecipeItem() {}
      }

      scraper = new mockClass(chtmlStub);
      scraper.recipeItem = null;
      scraper.finalRecipe = null;
      loggerStub.resetHistory();
      scraper.print();
    });

    it('loggerStub should not be invoked ', () => {
      sinon.assert.notCalled(loggerStub);
    });
  });
});