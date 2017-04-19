import * as _ from 'lodash';

const deepMerge = (a: any, b: any) => {
  Object.keys(b).forEach((key: string) => {
    if (['fields', 'args'].indexOf(key) !== -1) {
      return;
    }

    if (a[key] && b[key] && typeof a[key] === 'object' && typeof b[key] === 'object') {
      a[key] = deepMerge(a[key], b[key]);
    } else {
      a[key] = b[key];
    }
  });

  if (a.fields && b.fields) {
    a.fields = deepMerge(a.fields, b.fields);
  } else if (a.fields || b.fields) {
    a.fields = a.fields || b.fields;
  }

  return a;
};

const hasFragments = (info: any) => {
  return info.fragments && Object.keys(info.fragments).length > 0;
};

function isFragment(info: any, ast: any) {
  return hasFragments(info) && info.fragments[ast.name.value] && ast.kind !== 'FragmentDefinition';
}

function simplifyObjectValue(objectValue: any) {
  return objectValue.fields.reduce((memo: any, field: any) => {
    memo[field.name.value] =
      field.value.kind === 'IntValue' ? parseInt( field.value.value, 10 ) :
      field.value.kind === 'FloatValue' ? parseFloat( field.value.value ) :
      field.value.kind === 'ObjectValue' ? simplifyObjectValue( field.value ) :
        field.value.value;

    return memo;
  }, {});
}

function simplifyValue(value: any, info: any) {
  if (value.values) {
    return value.values.map((_value: any) => simplifyValue(_value, info));
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

export const simplifyAST = (ast: any, info?: any, parent?: any): any => {
  let selections;
  info = info || {};

  if (ast.selectionSet) {
    selections = ast.selectionSet.selections;
  }
  if (Array.isArray(ast)) {
    let simpleAST = {};
    ast.forEach((astElem: any) => {
      simpleAST = deepMerge(
        simpleAST, simplifyAST(astElem, info),
      );
    });

    return simpleAST;
  }

  if (isFragment(info, ast)) {
    return simplifyAST(info.fragments[ast.name.value], info);
  }

  if (!selections) {return {
    fields: {},
    args: {},
  };
  }

  return selections.reduce((simpleAST: any, selection: any) => {
    if (selection.kind === 'FragmentSpread' || selection.kind === 'InlineFragment') {
      simpleAST = deepMerge(
        simpleAST, simplifyAST(selection, info),
      );
      return simpleAST;
    }

    const name = selection.name.value;
    const alias = selection.alias && selection.alias.value;
    const key = alias || name;

    simpleAST.fields[key] = simpleAST.fields[key] || {};
    simpleAST.fields[key] = deepMerge(
      simpleAST.fields[key], simplifyAST(selection, info, simpleAST.fields[key]),
    );

    if (alias) {
      simpleAST.fields[key].key = name;
    }

    simpleAST.fields[key].args = selection.arguments.reduce((args: any, arg: any) => {
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
