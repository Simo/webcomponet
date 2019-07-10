import {Injector, NgModule} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MappaComponent } from './mappa.component';
import {createCustomElement} from '@angular/elements';



@NgModule({
  declarations: [MappaComponent],
  imports: [
    CommonModule
  ],
  exports: [ MappaComponent ],
  entryComponents: [ MappaComponent ]
})
export class MappaModule {

  constructor(private injector: Injector) {
      const elem = createCustomElement(MappaComponent, {injector: this.injector });
      customElements.define('my-mappa', elem);
  }

}
