import { GraphQLFieldConfig, GraphQLInterfaceType, GraphQLList, GraphQLObjectType } from 'graphql';
import { Connection } from 'graphql-relay';
export declare class NodeTypeMapper {
    private map;
    constructor();
    mapTypes(types: any): void;
    item(type: any): any;
}
export declare function idFetcher(sequelize: any, nodeTypeMapper: any): (globalId: any, context: any) => Promise<any>;
export declare function typeResolver(nodeTypeMapper: any): (obj: any) => any;
export declare function isConnection(type: any): any;
export declare function handleConnection(values: any, args: any): Connection<{}>;
export declare function sequelizeNodeInterface(sequelize: any): {
    nodeInterface: GraphQLInterfaceType;
    nodeField: GraphQLFieldConfig<any, any>;
    nodeTypeMapper: NodeTypeMapper;
};
export declare function nodeType(connectionType: any): any;
export declare function sequelizeConnection({name, nodeType, target, orderBy: orderByEnum, before, after, connectionFields, edgeFields, where}: any): {
    connectionType: GraphQLObjectType;
    edgeType: GraphQLObjectType;
    nodeType: any;
    resolveEdge: (item: any, index: any, queriedCursor: any, args: any, source: any) => {
        cursor: string;
        node: any;
        source: any;
    };
    connectionArgs: {
        orderBy: {
            type: GraphQLList<any>;
        };
        after: string;
        first: number;
        before: string;
        last: number;
    };
    resolve: (source: any, args: any, context: any, info: any) => Promise<any> | {
        source: any;
        args: any;
        where: {};
    };
};
