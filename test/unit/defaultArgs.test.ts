import * as chai from 'chai';
import { expect } from 'chai';
import { GraphQLInt, GraphQLNonNull, GraphQLScalarType, GraphQLString } from 'graphql';
import * as Sequelize from 'sequelize';
import { defaultArgs } from '../../src/defaultArgs';
import { JSONType } from '../../src/types/jsonType';
import { sequelize } from '../support/helper';

describe('defaultArgs', () => {
  it('should return a key for a integer primary key', () => {
    const model = sequelize.define('DefaultArgModel', {});
    const args = defaultArgs(model);

    expect(args).to.have.ownProperty('id');
    expect(args.id.type).to.equal(GraphQLInt);
  });

  it('should return a key for a string primary key', () => {
    const model = sequelize.define('DefaultArgModel', {
      modelId: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
    });
    const args = defaultArgs(model);

    expect(args.modelId.type).to.equal(GraphQLString);
  });

  it('should return a key for a string primary key', () => {
    const model = sequelize.define('DefaultArgModel', {
      uuid: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
    });
    const args = defaultArgs(model);

    expect(args.uuid.type).to.equal(GraphQLString);
  });

  describe('will have an "where" argument', () => {

    it('that is an GraphQLScalarType', () => {
      const model = sequelize.define('DefaultArgModel', {
        modelId: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
      });
      const args = defaultArgs(model);

      expect(args).to.have.ownProperty('where');
      expect(args.where.type).to.be.an.instanceOf(GraphQLScalarType);
    });

  });


});
