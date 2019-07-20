import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from 'ionic-angular';

import { Observable } from 'rxjs/Rx';

import { Author } from '../models/author';
import { User } from './user';
import { Api } from './api/api';

@Injectable()
export class Authors {

  private authors: Map<number,Author> = new Map<number,Author>();

  constructor(
    public api: Api,
  	public user: User,
  	public loadingCtrl: LoadingController,
  	public toastCtrl: ToastController
  ) { }


  // Get an authors bio
  getDetails(id: any) {
    let filter = [{"property":"user_id","value": id}];
    let params = { "filter": JSON.stringify(filter).trim() };

    let cached = this.authors.get(id);
    if (cached && cached.bio)
      return Observable.of(cached);
    
    let loader = this.api.showLoader();
    return this.api.get('1/user-bio', params).map((data: any) => {
      if (loader) loader.dismiss();
      if (!data.success) {
        this.api.showToast();
        return null;
      }

      if (!cached)
        cached = new Author({
          id: data.user.profile.id,
          picture: data.user.profile.userpic,
          name: data.user.profile.username,
        });
      
      cached.storycount = data.user.profile.submissions_count;
      cached.bio = data.user.profile.description;

      this.authors.set(cached.id, cached);
      return cached;

    }).catch((error) => {
      if (loader) loader.dismiss();
      this.api.showToast();
      console.error(error);
      return Observable.of(null);
    });
  }
  

  // get authors you are following
  getFollowing() {

    let loader = this.api.showLoader();
    return this.api.get('3/users/'+ this.user.getId()+ '/favorite/authors?params={%22nocache%22:true}').map((data: any) => {
      if (loader) loader.dismiss();
      if (!data.length) {
        this.api.showToast();
        return [];
      }

      return data.map((item) =>
        this.extractFromFeed(item)
      );

    }).catch((error) => {
      if (loader) loader.dismiss();
      this.api.showToast();
      console.error(error);
      return Observable.of([]);
    });
  }

  follow(author: Author) {
    let data = new FormData();
    data.append("type", "member");
    data.append("id", author.id);

    return this.api.post('3/users/follow/'+author.id, {}).map((res: any) => {
      if (!res.success) this.api.showToast();
      return res.success;
    }).catch((error) => {
      this.api.showToast();
      console.error(error);
      return Observable.of(false);
    }).subscribe(d => {
      if (d)
        author.following = true;
      else
        this.api.showToast();
    });
  }

  unfollow(author: Author) {
    return this.api.delete('3/users/follow/'+author.id).map((res: any) => {
      if (!res.success) this.api.showToast();
      return res.success;
    }).catch((error) => {
      this.api.showToast();
      console.error(error);
      return Observable.of(false);
    }).subscribe(d => {
      if (d)
        author.following = false;
    });
  }

  extractFromFeed(item) {
    let cached = this.authors.get(item.id);
    if (cached && cached.updatetimestamp)
      return cached;

    if (!cached)
      cached = new Author({
        id: item.userid,
        name: item.username,
        picture: item.userpic,
      });

    cached.jointimestamp = item.joindate;
    cached.following = true;

    this.authors.set(cached.id, cached);
    return cached;
  }

  extractFromSearch(item) {
    let cached = this.authors.get(item.id);
    if (cached)
      return cached;

    let author = new Author({
      id: item.id,
      name: item.username,
      picture: item.userpic,
    });

    this.authors.set(author.id, author);
    return author;
  }

  extractFromNewSearch(item) {
    let cached = this.authors.get(item.userid);
    if (cached)
      return cached;

    let author = new Author({
      id: item.userid,
      name: item.username,
      picture: item.userpic,
    });

    this.authors.set(author.id, author);
    return author;
  }


}
