"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataloader_sequelize_1 = require("dataloader-sequelize");
const graphql_1 = require("graphql");
const argsToFindOptions_1 = require("./argsToFindOptions");
const relay_1 = require("./relay");
exports.resolverFactory = (target, options) => {
    dataloader_sequelize_1.default(target);
    const isModel = !!target.getTableName;
    const isAssociation = !!target.associationType;
    const association = isAssociation && target;
    const model = isAssociation && target.target || isModel && target;
    const targetAttributes = Object.keys(model.rawAttributes);
    options = options || {};
    if (options.before === undefined) {
        options.before = (_options) => _options;
    }
    if (options.after === undefined) {
        options.after = (result) => result;
    }
    if (options.handleConnection === undefined) {
        options.handleConnection = true;
    }
    const resolver = (source, args, context, info) => {
        let type = info.returnType;
        const list = options.list || type instanceof graphql_1.GraphQLList;
        const findOptions = argsToFindOptions_1.argsToFindOptions(args, targetAttributes);
        info = Object.assign({}, (info || {}), { type: type, source: source });
        context = context || {};
        if (relay_1.isConnection(type)) {
            type = relay_1.nodeType(type);
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
                    const result = source.get(association.as);
                    if (options.handleConnection && relay_1.isConnection(info.returnType)) {
                        return relay_1.handleConnection(result, args);
                    }
                    return result;
                }
                else {
                    return source[association.accessors.get](_findOptions).then((result) => {
                        if (options.handleConnection && relay_1.isConnection(info.returnType)) {
                            return relay_1.handleConnection(result, args);
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
//# sourceMappingURL=resolver.js.map