import { replaceWhereOperators } from './replaceWhereOperators';

export function argsToFindOptions(args: any, targetAttributes: any) {
  const result: any = {};

  if (args) {
    Object.keys(args).forEach((key) => {
      if (!targetAttributes.indexOf(key)) {
        result.where = result.where || {};
        result.where[key] = args[key];
      }

      if (key === 'limit' && args[key]) {
        result.limit = parseInt(args[key], 10);
      }

      if (key === 'offset' && args[key]) {
        result.offset = parseInt(args[key], 10);
      }

      if (key === 'order' && args[key]) {
        if (args[key].indexOf('reverse:') === 0) {
          result.order = [[args[key].substring(8), 'DESC']];
        } else {
          result.order = [[args[key], 'ASC']];
        }
      }

      if (key === 'where' && args[key]) {
        // setup where
        result.where = replaceWhereOperators(args.where);
      }

    });
  }

  return result;
}
