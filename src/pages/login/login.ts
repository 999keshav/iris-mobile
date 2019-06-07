import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, NavParams, Platform, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { IrisProvider } from '../../providers/iris/iris';
import { IrisInfoProvider } from '../../providers/iris_info/iris_info';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {
  loading: boolean;
  debug: boolean;
  username: string;

  constructor(public events: Events, public navCtrl: NavController, public navParams: NavParams,
    private storage: Storage, private iris: IrisProvider, private info: IrisInfoProvider,
    private platform: Platform, private changeDetector: ChangeDetectorRef) {
    this.loading = true;
    this.debug = false;
  }
  
  resetCredentials() {
    this.storage.remove('refreshExpiry')
    this.storage.remove('accessExpiry')
  }

  debugLogin() {
    this.info.setUsername(this.username);
    this.storage.ready().then(
      () => this.storage.set('accessKey', 'abc')
    ).then(
      () => this.storage.set('accessKeyId', '123')
    ).then(
      () => this.info.init()
    ).then(
      () => {
        // emit login event so app.component.ts can change root to tabspage
        this.events.publish('user:login');       
      }
  
    )
  }

  showSSO() {
    let loggedOut = this.navParams.get('loggedOut');
    loggedOut = loggedOut ? loggedOut : false;
    this.iris.renewRefreshKey(loggedOut).subscribe(
      () => {
              // emit login event so app.component.ts can change root to tabspage
              this.events.publish('user:login');          
      },
      () => {
        this.loading = false;
        // Need to trigger Angular change detection here to update the page
        this.changeDetector.detectChanges();
      }
    );
  }

  ionViewDidLoad() {
    // If cordova, redirect to SSO login page
    if (this.platform.is('cordova')) {
      this.storage.ready().then(() => {
        this.showSSO();
      })
    // For browser local testing, show debug login page
    } else {
      this.resetCredentials();
      this.loading = false;
      this.debug = true;
      this.iris.debug();
      return;
    }
  }

}
