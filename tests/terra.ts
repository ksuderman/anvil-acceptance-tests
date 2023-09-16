/**
 *  Copyright 2023 The Galaxy Project (https://galaxyproject.org)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Page, expect } from '@playwright/test';
import { TimeUnits } from './timeunits';

require('dotenv').config({ path: '.env.local' })

/**
 * A class to handle interactions with the Terra UI.
 * 
 * This class handles:
 * 1. Logging in to Terra with the appropriate Google account
 * 2. Launching new Galaxy instances
 * 3. Connecting to already running Galaxy instances
 * 4. Shutting down Galaxu instances
 */
export class Terra {
  
  // URLs of the Terra instances we can connect to
  static readonly test: string = 'https://bvdp-saturn-dev.appspot.com/#workspaces/galaxy-anvil-dev/'; //integration_tests';
  static readonly production: string = 'https://app.terra.bio/#workspaces/notebooks-canary-project/'; //integration_tests';

  constructor(public readonly page: Page) {
  }

  async login(url?: string | undefined) {
    let workspace = 'acceptance-tests'
    if ('TERRA_WORKSPACE' in process.env) {
      workspace = process.env.TERRA_WORKSPACE!
      if (workspace === 'acceptance') workspace = 'acceptance-tests'
      else if (workspace === 'integration') workspace = 'integration_tests'
    }
    if (typeof(url) === 'undefined') {
      url = Terra.production + workspace
    }
    if ('TERRA_URL' in process.env) {
      url = process.env.TERRA_URL!
      if (url === 'test') {
        url = Terra.test + workspace
      }
      else if (url === 'production') {
        url = Terra.production + workspace
      }
    }
    console.log(`Logging in to ${url}`)
    await this.page.goto(url);
    await this.page.getByRole('button', { name: 'Agree' }).click();
    const page1Promise = this.page.waitForEvent('popup');
    await this.page.getByRole('button', { name: 'Sign In' }).click();
    const page1 = await page1Promise;
    await page1.getByRole('button', { name: 'Sign in with Google' }).click();
    if (await page1.getByLabel('Email or phone').isVisible()) {
      await page1.getByLabel('Email or phone').fill(process.env.TERRA_EMAIL!);
      await page1.click("#identifierNext")
      await page1.getByLabel('Enter your password').fill(process.env.TERRA_PASSWORD!);  
      await page1.click("#passwordNext")
    }
    console.log("Logged in")
  }

  async launch() {
    await expect(this.page.getByRole('button', {name: 'Sign In'})).toHaveCount(0, {timeout: TimeUnits.seconds(30).msec()})
    await this.page.getByRole('button', { name: 'Environment Configuration' }).click({timeout: TimeUnits.minutes(1).msec()});
    await this.page.getByLabel('GALAXY Environment').click({timeout: TimeUnits.minutes(1).msec()});
    await this.page.getByRole('button', { name: 'Next' }).click();
    await this.page.getByRole('button', { name: 'Create' }).click();
    console.log('Galaxy launched')
  }

  async openGalaxy() {
    await this.page.getByLabel('Galaxy EnvironmentRunning').click();
    const page2Promise = this.page.waitForEvent('popup');
    await this.page.getByLabel('Launch GALAXY').click();
    const page2 = await page2Promise;
    return page2
  }

  async shutdown(deleteDisks: boolean = false) {
    console.log('Deleting Galaxy instance')
    await this.page.getByLabel('GALAXY Environment', { exact: false }).click();
    await this.page.getByText('Settings').click()
    await this.page.getByRole('button', { name: 'Delete Environment' }).click();
    if (deleteDisks) {
      await this.page.getByLabel('Delete everything, including persistent disk').check();
    }
    // else the default is to not delete disks
    await this.page.getByRole('button', { name: 'Delete' }).click();
    expect(this.page.getByRole('button', {name: 'Galaxy Environment'})).toBeHidden()
    console.log('Galaxy instance deleted')
  }
}