import { expect } from 'chai';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  } from 'graphql';
import * as Sequelize from 'sequelize';
import { mapType, toGraphQL } from '../../src/typeMapper';


const {
  BOOLEAN,
  ENUM,
  FLOAT,
  CHAR,
  DECIMAL,
  DOUBLE,
  INTEGER,
  BIGINT,
  STRING,
  TEXT,
  UUID,
  DATE,
  DATEONLY,
  TIME,
  ARRAY,
  VIRTUAL,
  } = Sequelize;

const makeType = (type: any, ...elemType: any[]) => {
  return new type(...elemType);
};

describe('typeMapper', () => {

  describe('ARRAY', () => {
    it('should map to instance of GraphQLList', () => {
      expect(toGraphQL(makeType(ARRAY, STRING), Sequelize)).to.instanceof(GraphQLList);
    });
  });

  describe('BIGINT', () => {
    it('should map to GraphQLString', () => {
      expect(toGraphQL(makeType(BIGINT), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('BOOLEAN', () => {
    it('should map to GraphQLBoolean', () => {
      expect(toGraphQL(makeType(BOOLEAN), Sequelize)).to.equal(GraphQLBoolean);
    });
  });

  describe('CHAR', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(CHAR), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('CUSTOM', () =>  {
    before(() =>  {
      // setup mapping
      mapType((type: any) => {
        if (type instanceof (BOOLEAN as any)) {
          return GraphQLString;
        }
        if (type instanceof FLOAT) {
          return false;
        }
      });
    });
    it('should fallback to default types if it returns false', () =>  {
      expect(toGraphQL(makeType(FLOAT), Sequelize)).to.equal(GraphQLFloat);
    });
    it('should allow the user to map types to anything', () =>  {
      expect(toGraphQL(makeType(BOOLEAN), Sequelize)).to.equal(GraphQLString);
    });

    // reset mapType
    after(() =>  {
      mapType(null);
    });

  });

  describe('DATE', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(DATE), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('DATEONLY', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(DATEONLY), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('DECIMAL', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(DECIMAL), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('DOUBLE', () =>  {
    it('should map to GraphQLFloat', () =>  {
      expect(toGraphQL(makeType(DOUBLE), Sequelize)).to.equal(GraphQLFloat);
    });
  });

  describe('ENUM', () =>  {
    it('should map to instance of GraphQLEnumType', () =>  {
      expect(toGraphQL(makeType(ENUM, 'value', 'another value'), Sequelize)).to.instanceof(GraphQLEnumType);
    });
  });

  describe('FLOAT', () =>  {
    it('should map to GraphQLFloat', () =>  {
      expect(toGraphQL(makeType(FLOAT), Sequelize)).to.equal(GraphQLFloat);
    });
  });


  describe('INTEGER', () =>  {
    it('should map to GraphQLInt', () =>  {
      expect(toGraphQL(makeType(INTEGER), Sequelize)).to.equal(GraphQLInt);
    });
  });

  describe('STRING', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(STRING), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('TEXT', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(TEXT), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('TIME', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(TIME), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('UUID', () =>  {
    it('should map to GraphQLString', () =>  {
      expect(toGraphQL(makeType(UUID), Sequelize)).to.equal(GraphQLString);
    });
  });

  describe('VIRTUAL', () =>  {

    it('should map to the sequelize return type', () =>  {
      expect(toGraphQL(makeType(VIRTUAL, BOOLEAN, ['createdAt']), Sequelize)).to.equal(GraphQLBoolean);
    });

    it('should default to a GraphQLString is a return type is not provided', () =>  {
      expect(toGraphQL(makeType(VIRTUAL), Sequelize)).to.equal(GraphQLString);
    });

  });
});
