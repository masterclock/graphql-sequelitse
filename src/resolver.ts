import dataLoaderSequelize from 'dataloader-sequelize';
// import { invariant } from 'assert';
import { GraphQLList } from 'graphql';

import { argsToFindOptions } from './argsToFindOptions';
import { handleConnection, isConnection, nodeType } from './relay';

export const resolverFactory = (target: any, options?: any) => {
  dataLoaderSequelize(target);
  const isModel = !!target.getTableName;
  const isAssociation = !!target.associationType;
  const association = isAssociation && target;
  const model = isAssociation && target.target || isModel && target;

  const targetAttributes = Object.keys(model.rawAttributes);

  options = options || {};

  // invariant(options.include === undefined, 'Include support has been removed in favor of dataloader batching');

  if (options.before === undefined) {
    options.before = (_options: any) => _options;
  }
  if (options.after === undefined) {
    options.after = (result: any) => result;
  }
  if (options.handleConnection === undefined) {
    options.handleConnection = true;
  }

  const resolver = (source: any, args: any, context?: any, info?: any) => {
    let type = info.returnType;
    const list = options.list || type instanceof GraphQLList;
    const findOptions = argsToFindOptions(args, targetAttributes);

    info = {
      ...(info || {}),
      type: type,
      source: source,
    };

    context = context || {};

    if (isConnection(type)) {
      type = nodeType(type);
    }

    type = type.ofType || type;

    findOptions.attributes = targetAttributes;
    findOptions.logging = findOptions.logging || context.logging;

    return Promise.resolve(options.before(findOptions, args, context, info)).then((_findOptions) => {
      if (list && !_findOptions.order) {
        _findOptions.order = [[model.primaryKeyAttribute, 'ASC']];
      }

      if (association) {
        if (source.get(association.as) !== undefined) {
          // The user did a manual include
          const result = source.get(association.as);
          if (options.handleConnection && isConnection(info.returnType)) {
            return handleConnection(result, args);
          }

          return result;
        } else {
          return source[association.accessors.get](_findOptions).then((result: any) => {
            if (options.handleConnection && isConnection(info.returnType)) {
              return handleConnection(result, args);
            }
            return result;
          });
        }
      }

      return model[list ? 'findAll' : 'findOne'](_findOptions);
    }).then((result) => {
      return options.after(result, args, context, info);
    });
  };

  return resolver;
};
