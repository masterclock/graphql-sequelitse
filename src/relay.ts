import { GraphQLEnumType, GraphQLFieldConfig, GraphQLInterfaceType, GraphQLList, GraphQLObjectType } from 'graphql';
import {
  Connection,
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  nodeDefinitions,
  } from 'graphql-relay';
import * as _ from 'lodash';
import { resolverFactory } from './resolver';
import { simplifyAST } from './simplifyAST';

import {
  base64,
  unbase64,
} from './base64.js';

export class NodeTypeMapper {
  private map: any;
  constructor() {
    this.map = {};
  }

  public mapTypes(types: any) {
    Object.keys(types).forEach((k) => {
      const v = types[k];
      this.map[k] = v.type
        ? v
        : { type: v };
    });
  }

  public item(type: any) {
    return this.map[type];
  }
}

export function idFetcher(sequelize: any, nodeTypeMapper: any) {
  return async (globalId: any, context: any) => {
    const { type, id } = fromGlobalId(globalId);

    const nodeType = nodeTypeMapper.item(type);
    if (nodeType && typeof nodeType.resolve === 'function') {
      const res = await Promise.resolve(nodeType.resolve(globalId, context));
      if (res) {
        res.__graphqlType__ = type;
      }
      return res;
    }

    const model = Object.keys(sequelize.models).find((_model) => _model === type);
    return model
      ? sequelize.models[model].findById(id)
      : nodeType
        ? nodeType.type
        : null;
  };
}

export function typeResolver(nodeTypeMapper: any) {
  return (obj: any) => {
    const type = obj.__graphqlType__
      || (obj.Model
        ? obj.Model.options.name.singular
        : obj.name);

    if (!type) {
      throw new Error(`Unable to determine type of ${typeof obj}. ` +
        `Either specify a resolve function in 'NodeTypeMapper' object,` +
        `or specify '__graphqlType__' property on object.`);
    }

    const nodeType = nodeTypeMapper.item(type);
    return nodeType && nodeType.type || null;
  };
}

export function isConnection(type: any) {
  return typeof type.name !== 'undefined' && type.name.endsWith('Connection');
}

export function handleConnection(values: any, args: any) {
  return connectionFromArray(values, args);
}

export function sequelizeNodeInterface(sequelize: any) {
  const nodeTypeMapper = new NodeTypeMapper();
  const nodeObjects = nodeDefinitions(
    idFetcher(sequelize, nodeTypeMapper),
    typeResolver(nodeTypeMapper),
  );

  return {
    nodeTypeMapper,
    ...nodeObjects,
  };
}

export function nodeType(connectionType: any) {
  return connectionType._fields.edges.type.ofType._fields.node.type;
}

export function sequelizeConnection({
  name,
  nodeType,
  target,
  orderBy: orderByEnum,
  before,
  after,
  connectionFields,
  edgeFields,
  where,
}: any) {
  const {
    edgeType,
    connectionType,
  } = connectionDefinitions({
      name,
      nodeType,
      connectionFields,
      edgeFields,
    });

  const model = target.target ? target.target : target;
  const SEPERATOR = '$';
  const PREFIX = 'arrayconnection' + SEPERATOR;

  if (orderByEnum === undefined) {
    orderByEnum = new GraphQLEnumType({
      name: name + 'ConnectionOrder',
      values: {
        ID: { value: [model.primaryKeyAttribute, 'ASC'] },
      },
    });
  }

  before = before || ((options: any) => options);
  after = after || ((result: any) => result);

  const $connectionArgs = {
    ...connectionArgs,
    orderBy: {
      type: new GraphQLList(orderByEnum),
    },
  };

  const orderByAttribute = (orderAttr: any, { source, args, context, info }: any) => {
    return typeof orderAttr === 'function' ? orderAttr(source, args, context, info) : orderAttr;
  };

  const orderByDirection = (orderDirection: any, args: any) => {
    if (args.last) {
      return orderDirection.indexOf('ASC') >= 0
        ? orderDirection.replace('ASC', 'DESC')
        : orderDirection.replace('DESC', 'ASC');
    }
    return orderDirection;
  };

  /**
   * Creates a cursor given a item returned from the Database
   * @param  {Object}   item   sequelize model instance
   * @param  {Integer}  index  the index of this item within the results, 0 indexed
   * @return {String}          The Base64 encoded cursor string
   */
  const toCursor = (item: any, index: any) => {
    const id = item.get(model.primaryKeyAttribute);
    return base64(PREFIX + id + SEPERATOR + index);
  };

  /**
   * Decode a cursor into its component parts
   * @param  {String} cursor Base64 encoded cursor
   * @return {Object}        Object containing ID and index
   */
  const fromCursor = (cursor: string) => {
    cursor = unbase64(cursor);
    cursor = cursor.substring(PREFIX.length, cursor.length);
    const [id, index] = cursor.split(SEPERATOR);

    return {
      id,
      index,
    };
  };

  const argsToWhere = (args: any) => {
    const result = {};

    _.each(args, (value, key) => {
      if (key in $connectionArgs) {
        return;
      }
      _.assign(result, where(key, value, result));
    });

    return result;
  };

  const resolveEdge = (item: any, index: any, queriedCursor: any, args: any = {}, source: any) => {
    let startIndex = null;
    if (queriedCursor) {
      startIndex = Number(queriedCursor.index);
    }
    if (startIndex !== null) {
      startIndex++;
    } else {
      startIndex = 0;
    }

    return {
      cursor: toCursor(item, index + startIndex),
      node: item,
      source: source,
    };
  };

  const $resolver = resolverFactory(target, {
    handleConnection: false,
    list: true,
    before: (options: any, args: any, context: any, info: any) => {
      if (args.first || args.last) {
        options.limit = parseInt(args.first || args.last, 10);
      }
      if (!args.orderBy) {
        args.orderBy = [orderByEnum._values[0].value];
      } else if (typeof args.orderBy === 'string') {
        args.orderBy = [orderByEnum._nameLookup[args.orderBy].value];
      }

      const orderBy = args.orderBy;
      const orderAttribute = orderByAttribute(orderBy[0][0], {
        source: info.source,
        args,
        context,
        info,
      });
      const orderDirection = orderByDirection(orderBy[0][1], args);

      options.order = [
        [orderAttribute, orderDirection],
      ];

      if (orderAttribute !== model.primaryKeyAttribute) {
        options.order.push([model.primaryKeyAttribute, orderByDirection('ASC', args)]);
      }

      if (typeof orderAttribute === 'string') {
        options.attributes.push(orderAttribute);
      }

      if (options.limit &&
        !options.attributes.some((attribute: any) => attribute.length === 2 && attribute[1] === 'full_count')) {
        if (model.sequelize.dialect.name === 'postgres') {
          options.attributes.push([
            model.sequelize.literal('COUNT(*) OVER()'),
            'full_count',
          ]);
        } else if (model.sequelize.dialect.name === 'mssql') {
          options.attributes.push([
            model.sequelize.literal('COUNT(1) OVER()'),
            'full_count',
          ]);
        }
      }

      options.where = argsToWhere(args);

      if (args.after || args.before) {
        const cursor = fromCursor(args.after || args.before);
        const startIndex = Number(cursor.index);

        if (startIndex >= 0) {
          options.offset = startIndex + 1;
        }
      }
      options.attributes = _.uniq(options.attributes);
      return before(options, args, context, info);
    },
    after: async (values: any, args: any, context: any, info: any) => {
      const {
        source,
      } = info;

      let cursor: any = null;

      if (args.after || args.before) {
        cursor = fromCursor(args.after || args.before);
      }

      const edges = values.map((value: any, idx: any) => {
        return resolveEdge(value, idx, cursor, args, source);
      });

      const firstEdge = edges[0];
      const lastEdge = edges[edges.length - 1];
      let fullCount = values[0] && values[0].dataValues.full_count && parseInt(values[0].dataValues.full_count, 10);

      if (!values[0]) {
        fullCount = 0;
      }

      if ((args.first || args.last) && (fullCount === null || fullCount === undefined)) {
        // In case of `OVER()` is not available, we need to get the full count from a second query.
        const options = await Promise.resolve(before({
          where: argsToWhere(args),
        }, args, context, info));

        if (target.count) {
          if (target.associationType) {
            fullCount = await target.count(source, options);
          } else {
            fullCount = await target.count(options);
          }
        } else {
          fullCount = await target.manyFromSource.count(source, options);
        }
      }

      let hasNextPage = false;
      let hasPreviousPage = false;
      if (args.first || args.last) {
        const count = parseInt(args.first || args.last, 10);
        let index = cursor ? Number(cursor.index) : null;
        if (index !== null) {
          index++;
        } else {
          index = 0;
        }

        hasNextPage = index + 1 + count <= fullCount;
        hasPreviousPage = index - count >= 0;

        if (args.last) {
          [hasNextPage, hasPreviousPage] = [hasPreviousPage, hasNextPage];
        }
      }

      return after({
        source,
        args,
        where: argsToWhere(args),
        edges,
        pageInfo: {
          startCursor: firstEdge ? firstEdge.cursor : null,
          endCursor: lastEdge ? lastEdge.cursor : null,
          hasNextPage: hasNextPage,
          hasPreviousPage: hasPreviousPage,
        },
        fullCount,
      }, args, context, info);
    },
  });

  const resolver = (source: any, args: any, context: any, info: any) => {
    const fieldNodes = info.fieldASTs || info.fieldNodes;
    if (simplifyAST(fieldNodes[0], info).fields.edges) {
      return $resolver(source, args, context, info);
    }

    return {
      source,
      args,
      where: argsToWhere(args),
    };
  };

  return {
    connectionType,
    edgeType,
    nodeType,
    resolveEdge,
    connectionArgs: $connectionArgs,
    resolve: resolver,
  };
}
