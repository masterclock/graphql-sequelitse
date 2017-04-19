import * as chai from 'chai';
import { expect } from 'chai';
import { GraphQLInt, GraphQLNonNull, GraphQLScalarType, GraphQLString } from 'graphql';
import * as Sequelize from 'sequelize';
import { defaultListArgs } from '../../src/defaultListArgs';
import { sequelize } from '../support/helper';



describe('defaultListArgs', () =>  {
  it('should return a limit key', () =>  {
    const args = defaultListArgs();

    expect(args).to.have.ownProperty('limit');
    expect(args.limit.type).to.equal(GraphQLInt);
  });

  it('should return a order key', () =>  {
    const args = defaultListArgs();

    expect(args).to.have.ownProperty('order');
    expect(args.order.type).to.equal(GraphQLString);
  });

  describe('will have an "where" argument', () =>  {

    it('that is an GraphQLScalarType', () =>  {
      const model = sequelize.define('DefaultArgModel', {
        modelId: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
      });
      const args = defaultListArgs(model);

      expect(args).to.have.ownProperty('where');
      expect(args.where.type).to.be.an.instanceOf(GraphQLScalarType);
    });

  });

});
