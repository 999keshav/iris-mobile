import { Component, ComponentFactoryResolver, ViewChild, ViewContainerRef, Pipe, PipeTransform } from '@angular/core';
import { IrisProvider, Incident } from './../../providers/iris/iris';
import { TemplateProvider } from './../../providers/template/template';
import { NavController, NavParams, ToastController } from 'ionic-angular';
import { GraphBlockComponent } from '../../components/graph-block/graph-block';
import handlebars from 'handlebars';
import he from 'he';
import { IrisInfoProvider } from '../../providers/iris_info/iris_info';


// Return pretty JSON if input is an object
@Pipe({name: 'formatContext'})
export class FormatContextPipe implements PipeTransform {
  transform(value: any): string {
    if (value instanceof Object) {
      return JSON.stringify(value, null, 2)
    } else {
      return value;
    }
  }
}


@Component({
  selector: 'page-incident-context',
  templateUrl: 'incident-context.html',
})
export class IncidentContextPage {

  objectKeys = Object.keys;
  incident: Incident;
  template: string;
  source: string;
  loading: boolean;
  noTemplate: boolean = false;
  disableClaim: boolean;

  // Placeholder for page location to render graphs
  @ViewChild('graphContainer', {read: ViewContainerRef }) graphContainer;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private iris: IrisProvider, private templateProvider: TemplateProvider,
    private toastCtrl: ToastController, private irisInfo: IrisInfoProvider,
    private componentFactoryResolver: ComponentFactoryResolver) {
  }

  ionViewDidLoad() {
    this.loading = true;
    this.iris.getIncident(this.navParams.get('incidentId')).subscribe( (incident) =>
      {
        this.incident = incident;
        if (this.navParams.get('claim')) {
          this.claim();
        }
        // Get template for this incident
        this.templateProvider.getTemplate(this.incident['application']).subscribe(data => {
          this.template = data;
          if (!this.template) {
            this.noTemplate = true;
            this.loading = false;
            return;
          }

          let template = handlebars.compile(this.template),
          result = template(this.incident['context']),
          graphRe = /<graph-block\s+src\s*=\s*['"](.*)['"]\s+label\s*=\s*['"](.*)['"]>/g,
          graphBlocks = [],
          factory = this.componentFactoryResolver.resolveComponentFactory(GraphBlockComponent);

          // Replace <graph-block> blocks in the template with '', add parsed info to graphBlocks
          result.replace(graphRe, (_, src, label) => {graphBlocks.push({src: he.decode(src), label: label}); return ''})
          // Use graph block component factory to render dynamic graph blocks
          for (let g of graphBlocks) {
            let componentRef = this.graphContainer.createComponent(factory);
            (<GraphBlockComponent>componentRef.instance).source = g.src;
            (<GraphBlockComponent>componentRef.instance).label = g.label;
          }
          this.source = result;
          this.loading = false;
        });
      }
    )
  }

  claim() {
    this.disableClaim = true;
    this.iris.claim([this.incident]).subscribe(
      () => {
        this.incident.owner = this.irisInfo.username;
        let toast = this.toastCtrl.create({
          message: "Incident claimed",
          duration: 3000,
          position: 'bottom',
          showCloseButton: true,
          closeButtonText: 'OK'
        });
        toast.present();
      },
      () => {
        let toast = this.toastCtrl.create({
          message: "Error, couldn't claim incident",
          duration: 3000,
          position: 'bottom',
          showCloseButton: true,
          closeButtonText: 'OK'
        });
        toast.present();
        this.disableClaim = false;
      })
  }

}
