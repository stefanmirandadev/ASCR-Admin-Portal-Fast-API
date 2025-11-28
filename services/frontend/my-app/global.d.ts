import type { IStaticMethods } from "preline/dist";

declare global {
  interface Window {
    // Optional third-party libraries
    _: any;
    $: any;
    jQuery: any;
    DataTable: any;
    Dropzone: any;
    VanillaCalendarPro: any;
    noUiSlider: any;
    // Preline UI
    HSStaticMethods: IStaticMethods;
  }
}

declare module 'jquery';
declare module 'lodash';
declare module 'nouislider';
declare module 'datatables.net';
declare module 'dropzone/dist/dropzone-min.js';
declare module 'vanilla-calendar-pro';

export {}; 