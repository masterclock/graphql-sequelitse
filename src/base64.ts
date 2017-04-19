export const base64 = (i: string) => {
  return (new Buffer(i, 'ascii')).toString('base64');
};

export const unbase64 = (i: string) => {
  return (new Buffer(i, 'base64')).toString('ascii');
};
