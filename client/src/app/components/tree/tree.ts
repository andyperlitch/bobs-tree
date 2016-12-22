import * as d3 from 'd3';

function TreeController(api: API.Client.DefaultApi) {
  console.log('api: ', api);
}

export const tree: angular.IComponentOptions = {
  template: require('./tree.html'),
  controller: TreeController
};
