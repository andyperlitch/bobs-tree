// import 'services/DefaultApi/DefaultApi';
import * as angular from 'angular';
import {tree} from 'components/tree/tree';
import 'angular-ui-router';
import routesConfig from './routes';

import './index.less';
export const app: string = 'app';

angular
  .module(app, ['ui.router'])
  .config(routesConfig)
  .component('tree', tree)
  .service('api', API.Client.DefaultApi);
