"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepMerge = (a, b) => {
    Object.keys(b).forEach((key) => {
        if (['fields', 'args'].indexOf(key) !== -1) {
            return;
        }
        if (a[key] && b[key] && typeof a[key] === 'object' && typeof b[key] === 'object') {
            a[key] = deepMerge(a[key], b[key]);
        }
        else {
            a[key] = b[key];
        }
    });
    if (a.fields && b.fields) {
        a.fields = deepMerge(a.fields, b.fields);
    }
    else if (a.fields || b.fields) {
        a.fields = a.fields || b.fields;
    }
    return a;
};
const hasFragments = (info) => {
    return info.fragments && Object.keys(info.fragments).length > 0;
};
function isFragment(info, ast) {
    return hasFragments(info) && info.fragments[ast.name.value] && ast.kind !== 'FragmentDefinition';
}
function simplifyObjectValue(objectValue) {
    return objectValue.fields.reduce((memo, field) => {
        memo[field.name.value] =
            field.value.kind === 'IntValue' ? parseInt(field.value.value, 10) :
                field.value.kind === 'FloatValue' ? parseFloat(field.value.value) :
                    field.value.kind === 'ObjectValue' ? simplifyObjectValue(field.value) :
                        field.value.value;
        return memo;
    }, {});
}
function simplifyValue(value, info) {
    if (value.values) {
        return value.values.map((_value) => simplifyValue(_value, info));
    }
    if ('value' in value) {
        return value.value;
    }
    if (value.kind === 'ObjectValue') {
        return simplifyObjectValue(value);
    }
    if (value.name) {
        return info.variableValues[value.name.value];
    }
}
exports.simplifyAST = (ast, info, parent) => {
    let selections;
    info = info || {};
    if (ast.selectionSet) {
        selections = ast.selectionSet.selections;
    }
    if (Array.isArray(ast)) {
        let simpleAST = {};
        ast.forEach((astElem) => {
            simpleAST = deepMerge(simpleAST, exports.simplifyAST(astElem, info));
        });
        return simpleAST;
    }
    if (isFragment(info, ast)) {
        return exports.simplifyAST(info.fragments[ast.name.value], info);
    }
    if (!selections) {
        return {
            fields: {},
            args: {},
        };
    }
    return selections.reduce((simpleAST, selection) => {
        if (selection.kind === 'FragmentSpread' || selection.kind === 'InlineFragment') {
            simpleAST = deepMerge(simpleAST, exports.simplifyAST(selection, info));
            return simpleAST;
        }
        const name = selection.name.value;
        const alias = selection.alias && selection.alias.value;
        const key = alias || name;
        simpleAST.fields[key] = simpleAST.fields[key] || {};
        simpleAST.fields[key] = deepMerge(simpleAST.fields[key], exports.simplifyAST(selection, info, simpleAST.fields[key]));
        if (alias) {
            simpleAST.fields[key].key = name;
        }
        simpleAST.fields[key].args = selection.arguments.reduce((args, arg) => {
            args[arg.name.value] = simplifyValue(arg.value, info);
            return args;
        }, {});
        if (parent) {
            Object.defineProperty(simpleAST.fields[key], '$parent', { value: parent, enumerable: false });
        }
        return simpleAST;
    }, {
        fields: {},
        args: {},
    });
};
//# sourceMappingURL=simplifyAST.js.map