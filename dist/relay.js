"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_relay_1 = require("graphql-relay");
const _ = require("lodash");
const resolver_1 = require("./resolver");
const simplifyAST_1 = require("./simplifyAST");
const base64_js_1 = require("./base64.js");
class NodeTypeMapper {
    constructor() {
        this.map = {};
    }
    mapTypes(types) {
        Object.keys(types).forEach((k) => {
            const v = types[k];
            this.map[k] = v.type
                ? v
                : { type: v };
        });
    }
    item(type) {
        return this.map[type];
    }
}
exports.NodeTypeMapper = NodeTypeMapper;
function idFetcher(sequelize, nodeTypeMapper) {
    return (globalId, context) => __awaiter(this, void 0, void 0, function* () {
        const { type, id } = graphql_relay_1.fromGlobalId(globalId);
        const nodeType = nodeTypeMapper.item(type);
        if (nodeType && typeof nodeType.resolve === 'function') {
            const res = yield Promise.resolve(nodeType.resolve(globalId, context));
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
    });
}
exports.idFetcher = idFetcher;
function typeResolver(nodeTypeMapper) {
    return (obj) => {
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
exports.typeResolver = typeResolver;
function isConnection(type) {
    return typeof type.name !== 'undefined' && type.name.endsWith('Connection');
}
exports.isConnection = isConnection;
function handleConnection(values, args) {
    return graphql_relay_1.connectionFromArray(values, args);
}
exports.handleConnection = handleConnection;
function sequelizeNodeInterface(sequelize) {
    const nodeTypeMapper = new NodeTypeMapper();
    const nodeObjects = graphql_relay_1.nodeDefinitions(idFetcher(sequelize, nodeTypeMapper), typeResolver(nodeTypeMapper));
    return Object.assign({ nodeTypeMapper }, nodeObjects);
}
exports.sequelizeNodeInterface = sequelizeNodeInterface;
function nodeType(connectionType) {
    return connectionType._fields.edges.type.ofType._fields.node.type;
}
exports.nodeType = nodeType;
function sequelizeConnection({ name, nodeType, target, orderBy: orderByEnum, before, after, connectionFields, edgeFields, where, }) {
    const { edgeType, connectionType, } = graphql_relay_1.connectionDefinitions({
        name,
        nodeType,
        connectionFields,
        edgeFields,
    });
    const model = target.target ? target.target : target;
    const SEPERATOR = '$';
    const PREFIX = 'arrayconnection' + SEPERATOR;
    if (orderByEnum === undefined) {
        orderByEnum = new graphql_1.GraphQLEnumType({
            name: name + 'ConnectionOrder',
            values: {
                ID: { value: [model.primaryKeyAttribute, 'ASC'] },
            },
        });
    }
    before = before || ((options) => options);
    after = after || ((result) => result);
    const $connectionArgs = Object.assign({}, graphql_relay_1.connectionArgs, { orderBy: {
            type: new graphql_1.GraphQLList(orderByEnum),
        } });
    const orderByAttribute = (orderAttr, { source, args, context, info }) => {
        return typeof orderAttr === 'function' ? orderAttr(source, args, context, info) : orderAttr;
    };
    const orderByDirection = (orderDirection, args) => {
        if (args.last) {
            return orderDirection.indexOf('ASC') >= 0
                ? orderDirection.replace('ASC', 'DESC')
                : orderDirection.replace('DESC', 'ASC');
        }
        return orderDirection;
    };
    const toCursor = (item, index) => {
        const id = item.get(model.primaryKeyAttribute);
        return base64_js_1.base64(PREFIX + id + SEPERATOR + index);
    };
    const fromCursor = (cursor) => {
        cursor = base64_js_1.unbase64(cursor);
        cursor = cursor.substring(PREFIX.length, cursor.length);
        const [id, index] = cursor.split(SEPERATOR);
        return {
            id,
            index,
        };
    };
    const argsToWhere = (args) => {
        const result = {};
        _.each(args, (value, key) => {
            if (key in $connectionArgs) {
                return;
            }
            _.assign(result, where(key, value, result));
        });
        return result;
    };
    const resolveEdge = (item, index, queriedCursor, args = {}, source) => {
        let startIndex = null;
        if (queriedCursor) {
            startIndex = Number(queriedCursor.index);
        }
        if (startIndex !== null) {
            startIndex++;
        }
        else {
            startIndex = 0;
        }
        return {
            cursor: toCursor(item, index + startIndex),
            node: item,
            source: source,
        };
    };
    const $resolver = resolver_1.resolverFactory(target, {
        handleConnection: false,
        list: true,
        before: (options, args, context, info) => {
            if (args.first || args.last) {
                options.limit = parseInt(args.first || args.last, 10);
            }
            if (!args.orderBy) {
                args.orderBy = [orderByEnum._values[0].value];
            }
            else if (typeof args.orderBy === 'string') {
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
                !options.attributes.some((attribute) => attribute.length === 2 && attribute[1] === 'full_count')) {
                if (model.sequelize.dialect.name === 'postgres') {
                    options.attributes.push([
                        model.sequelize.literal('COUNT(*) OVER()'),
                        'full_count',
                    ]);
                }
                else if (model.sequelize.dialect.name === 'mssql') {
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
        after: (values, args, context, info) => __awaiter(this, void 0, void 0, function* () {
            const { source, } = info;
            let cursor = null;
            if (args.after || args.before) {
                cursor = fromCursor(args.after || args.before);
            }
            const edges = values.map((value, idx) => {
                return resolveEdge(value, idx, cursor, args, source);
            });
            const firstEdge = edges[0];
            const lastEdge = edges[edges.length - 1];
            let fullCount = values[0] && values[0].dataValues.full_count && parseInt(values[0].dataValues.full_count, 10);
            if (!values[0]) {
                fullCount = 0;
            }
            if ((args.first || args.last) && (fullCount === null || fullCount === undefined)) {
                const options = yield Promise.resolve(before({
                    where: argsToWhere(args),
                }, args, context, info));
                if (target.count) {
                    if (target.associationType) {
                        fullCount = yield target.count(source, options);
                    }
                    else {
                        fullCount = yield target.count(options);
                    }
                }
                else {
                    fullCount = yield target.manyFromSource.count(source, options);
                }
            }
            let hasNextPage = false;
            let hasPreviousPage = false;
            if (args.first || args.last) {
                const count = parseInt(args.first || args.last, 10);
                let index = cursor ? Number(cursor.index) : null;
                if (index !== null) {
                    index++;
                }
                else {
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
        }),
    });
    const resolver = (source, args, context, info) => {
        const fieldNodes = info.fieldASTs || info.fieldNodes;
        if (simplifyAST_1.simplifyAST(fieldNodes[0], info).fields.edges) {
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
exports.sequelizeConnection = sequelizeConnection;
//# sourceMappingURL=relay.js.map