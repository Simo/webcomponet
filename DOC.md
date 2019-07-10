# Web Components

tecnologie dietro

* Templates
* Shadow DOM
* Custom Elements

Angular va a "mappare" queste tecnologie con sue "interpretazioni"

* Templates > Angular
* Shadow DOM > @Component(encapsulation: Emulated)
* Custom Elements > Angular Elements


Per usare Angular dobbiamo creare un component e metterlo tra gli entryComponent

```typescript
@NgModule({
    imports: [BrowserModule],
    declarations: [MyComponent],
    entryComponents: [MyComponent]
})
export class MyModule {

    constructor(private injector: Injector){
        const MyElement = createCustomElement(
                            MyComponent, { injector: this.injector });
                            
        customElements.define('my-element', MyElement);
    }
}
```

Nel caso volessimo usare il custom element all'interno di una applicazione Angular, dobbiamo passare nel modulo principale,
una dichiarazione che dica al compilatore che si troverà degli elementi non noti (custom appunto) e che non impazzisca

```
schemas: [CUSTOM_ELEMENTS_SCHEMA]
```

Nel caso dovessimo garantire compatibilità con browser legacy (IE 11 in giù) sarà necessario inserire dei polyfills `@webcomponents/webcomponentsjs` (non è il più snello, ma funziona con tutti i browser).

Abbiamo necessità di 2 polyfills:

* un polyfill per quei browser che non supportano i webcomponents (loader)
* un polyfill per i browser che supportono i webcomponents (es5-adapter)

Nel file polyfills.ts

```typescript
import '@webcomponents/webcomponentsjs/custom-elements-es5-adapter'

if (!window['customElements']) {
    document.write('<script src="/assets/webcomponentsjs/webcompoonents-loader.js"></script>'
}
```

Per la gestione dei polyfills c'è una libreria:

`ng add ngx-build-plus`

con la quale posso generare i polyfills che mi servono

`ng g ngx-build-plus:wc-polyfill -f`

## Alternative a es5-adapter

abbiamo bisogno di 3 steps

1. `browserlist` file: aggiunge il supporto per i browser ES5 (ie9/11)
2. tsconfig.json: impostare il target a ES2015 "target": "ES2015"
3. prima bisogna creare una build di produzione: `ng build --prod

ma come può un browser decidere quale componente caricare (ie9-11 avrà bisogno della versione ES5, gli altri della versione ES2015)

```
<script src="main-es5.js"></script>
<script src="main-es2015.js"></script>
```

attraverso l'attributo `module`

```html
<script src="main-es5.js" nomodule></script>
<!-- ignorato dai vecchi browser -->
<script src="main-es2015.js" type="module"></script>
```

## Shadow DOM

E' presente in Angular dalla versione 2
Il default è il modello di incapsulamento in "Emulazione" `@Component({encapsulation: ViewEncapsulations.Emulated})`, ma se vogliamo la versione è quella nativa `@Component({encapsulation: ViewEncapsulations.Native})` (la versione browser native che attiva  Shadow DOM(v0)) ma questa versione di Shadow DOM non è affidabile, volendo prendere la versione v1 mettiamo `@Component({encapsulation: ViewEncapsulations.ShadowDom})`, ma forse vogliamo non usarla `@Component({encapsulation: ViewEncapsulations.None})`

## Aggiungere dinamicamente un Custom Element

La tecnica è sempre quella classica

```javascript
const elm = document.createElement('my-element');

elm.setAttribute(...);
elm['propertyName'] = ...;
elm.addEventListener(...);

otherElement.appendChild(elm);
```

Cioè il browser non distingue tra componenti angular e altri elementi.

2 steps per il Lazy Loading di Custom Elements

* registrare il module del CE nel angular.json (in tal modo l'applicazione sa che sarà caricato in maniera "lazy")
* caricare il modulo attraverso l'interfaccia `NgModuleFactoryLoader`

```typescript
// nell'angular.json

"lazyModules": [
    "src/app/dashboard/lazy-dashboard-tile/lazy-dashboard.module"
]
// questo crea un bundle per il nostro modulo in compilazione

// nel service che inietta il modulo
constructor(
    private loader: NgModuleFactoryLoader,
    private injector: Injector
    ) {}
    
private moduleRef: NgModuleRef<any>;
    
load(): Promise<void> {
    
    const path = 'src/.../lazy-dashboard.module';
    
    return this
        .loader
        .load(path)
        .then(moduleFactory => {
        this.moduleRef = moduleFactory.create(this.injector).instance;
        console.debug('moduleRef', this.moduleRef);
        })
        .catch(err => {
        console.error('error loading module', err);
        })
}
```

## Adding External 

1. Creare un'applicazione solo per i Custom Elements
2. Compilare l'applicazione in un bundle autoconsistente
3. Caricare il bundle nell'applicazione client

nel modulo principale dell'applicazione del custom element dobbiamo mettere il component negli `entryComponents`

```typescript
bootstrap: [], // questo è importante
entryComponents: [
    ExternalDashboardTileComponent
]

export class AppModule {
    constructor(private injector: Injector) {}
    
    // dobbiamo dare un'implementazione per il bootstrap manuale
    ngDoBootstrap() {
        const externalTileCE = createCustomElement(ExternalDashboardTileComponent, {
        customElements.define('external-dashboard-tile', externalTileCE);
        }
    }
}
```

quando facciamo `ng build` abbiamo un sacco di bundle in uscita, che non è una cosa buona per un Custom Element, ma attraverso `ngx-build-plus` possiamo creare un singolo bundle con il comando

`ng build --single-bundle`

Metteremo il bundle nella cartella `asset`, poi creo un service che mi permetta di caricare il CE nella mia applicazione

```typescript
export class ExternalDashboardTileService {

    constructor() {}
    
    loaded = false;
    
    load(): void {
        // se è già caricato non serve ricaricarlo
        if (this.loaded) return:
        
        const script = document.createELement('script');
        script.src = 'assets/external-daschboard-tile.bundle.js';
        document.body.appendChild(script);
    }
}
```

## Comprimere i bundle

Ivy potrebbe aiutare molto, perchè riporta Angular verso l'API nativa dei browser. Ma l'integrazione sarà dopo la versione 8 (aiuterà con i widget di UI, ma non con le librerie)
Si può comunque comprimere i bundle.

Si può pensare di usare il concetto delle sharing-libs (sempre con l'uso `ngx-build-plus`)

`ng g ngx-build-plus:externals`

questo crea un webpack.externals.js che esporta degli shortcut per le librerie comuni

`npm run build:externals`

## Zone

Abbiamo bisogno di zone.js per gestire la change detection. Zone.js patches ogni browser event e notifica Angular di ogni utilizzo degli eventi.

Zone.js non va bene per i CE perchè occupa molto spazio (e ci sono dei problemi con le funzioni native async/await con ES 2017)

Come possiamo escludere zone.js?

```typescript
platformBrowserDynamic().bootstrapModule(AppModule, {ngZone: 'noop'})
```

Le conseguenze sono
* bisogna fare la change detection a manella
* fare la change detection via Observables

usare non `data | async` che richiede zone.js, ma `data | push`

## Content Projection & Slot API

CE hanno una diversa API per la content projection.

qui usiamo il tag `<slot>`

Per usare questo abbiamo dobbiamo usare ShadowDOM v1
