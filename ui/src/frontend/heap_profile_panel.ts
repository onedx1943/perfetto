// Copyright (C) 2019 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use size file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as m from 'mithril';

import {Actions} from '../common/actions';
import {
  ALLOC_SPACE_MEMORY_ALLOCATED_KEY,
  DEFAULT_VIEWING_OPTION,
  OBJECTS_ALLOCATED_KEY,
  OBJECTS_ALLOCATED_NOT_FREED_KEY,
  SPACE_MEMORY_ALLOCATED_NOT_FREED_KEY
} from '../common/flamegraph_util';
import {timeToCode} from '../common/time';

import {Flamegraph} from './flamegraph';
import {globals} from './globals';
import {Panel, PanelSize} from './panel';

interface HeapProfileDetailsPanelAttrs {}

const HEADER_HEIGHT = 30;

export class HeapProfileDetailsPanel extends
    Panel<HeapProfileDetailsPanelAttrs> {
  private ts = 0;
  private pid = 0;
  private flamegraph: Flamegraph = new Flamegraph([]);
  private currentViewingOption = DEFAULT_VIEWING_OPTION;

  view() {
    const heapDumpInfo = globals.heapProfileDetails;
    if (heapDumpInfo && heapDumpInfo.ts !== undefined &&
        heapDumpInfo.allocated !== undefined &&
        heapDumpInfo.allocatedNotFreed !== undefined &&
        heapDumpInfo.tsNs !== undefined && heapDumpInfo.pid !== undefined &&
        heapDumpInfo.upid !== undefined) {
      this.ts = heapDumpInfo.tsNs;
      this.pid = heapDumpInfo.pid;
      if (heapDumpInfo.flamegraph) {
        this.flamegraph.updateDataIfChanged(heapDumpInfo.flamegraph);
      }
      const height = heapDumpInfo.flamegraph ?
          this.flamegraph.getHeight() + HEADER_HEIGHT :
          0;
      return m(
          '.details-panel',
          {
            onclick: (e: MouseEvent) => {
              if (this.flamegraph !== undefined) {
                this.onMouseClick({y: e.layerY, x: e.layerX});
              }
              return false;
            },
            onmousemove: (e: MouseEvent) => {
              if (this.flamegraph !== undefined) {
                this.onMouseMove({y: e.layerY, x: e.layerX});
                globals.rafScheduler.scheduleRedraw();
              }
              return false;
            },
            onmouseout: () => {
              if (this.flamegraph !== undefined) {
                this.onMouseOut();
              }
            }
          },
          m('.details-panel-heading.heap-profile',
            [
              m('div.options',
                [
                  m('div.title', `Heap Profile:`),
                  this.getViewingOptionButtons(),
                ]),
              m('div.details',
                [
                  m('div.time',
                    `Snapshot time: ${timeToCode(heapDumpInfo.ts)}`),
                  m('button.download',
                    {
                      onclick: () => {
                        this.downloadPprof();
                      }
                    },
                    m('i.material-icons', 'file_download'),
                    'Download profile'),
                ]),
            ]),
          m(`div[style=height:${height}px]`),
      );
    } else {
      return m(
          '.details-panel',
          m('.details-panel-heading', m('h2', `Heap Profile`)));
    }
  }

  getButtonsClass(viewingOption = DEFAULT_VIEWING_OPTION): string {
    return this.currentViewingOption === viewingOption ? '.chosen' : '';
  }

  getViewingOptionButtons(): m.Children {
    return m(
        'div',
        m(`button${this.getButtonsClass(SPACE_MEMORY_ALLOCATED_NOT_FREED_KEY)}`,
          {
            onclick: () => {
              this.changeViewingOption(SPACE_MEMORY_ALLOCATED_NOT_FREED_KEY);
            }
          },
          'space'),
        m(`button${this.getButtonsClass(ALLOC_SPACE_MEMORY_ALLOCATED_KEY)}`,
          {
            onclick: () => {
              this.changeViewingOption(ALLOC_SPACE_MEMORY_ALLOCATED_KEY);
            }
          },
          'alloc_space'),
        m(`button${this.getButtonsClass(OBJECTS_ALLOCATED_NOT_FREED_KEY)}`,
          {
            onclick: () => {
              this.changeViewingOption(OBJECTS_ALLOCATED_NOT_FREED_KEY);
            }
          },
          'objects'),
        m(`button${this.getButtonsClass(OBJECTS_ALLOCATED_KEY)}`,
          {
            onclick: () => {
              this.changeViewingOption(OBJECTS_ALLOCATED_KEY);
            }
          },
          'alloc_objects'));
  }

  changeViewingOption(viewingOption: string) {
    this.currentViewingOption = viewingOption;
    globals.dispatch(Actions.changeViewHeapProfileFlamegraph({viewingOption}));
  }

  downloadPprof() {
    const engine = Object.values(globals.state.engines)[0];
    if (!engine) return;
    const src = engine.source;
    globals.dispatch(
        Actions.convertTraceToPprof({pid: this.pid, ts1: this.ts, src}));
  }

  private changeFlamegraphData() {
    const data = globals.heapProfileDetails;
    const flamegraphData = data.flamegraph === undefined ? [] : data.flamegraph;
    this.flamegraph.updateDataIfChanged(flamegraphData, data.expandedCallsite);
  }

  renderCanvas(ctx: CanvasRenderingContext2D, size: PanelSize) {
    this.changeFlamegraphData();
    const unit =
        this.currentViewingOption === SPACE_MEMORY_ALLOCATED_NOT_FREED_KEY ||
            this.currentViewingOption === ALLOC_SPACE_MEMORY_ALLOCATED_KEY ?
        'B' :
        '';
    this.flamegraph.draw(ctx, size.width, size.height, 0, HEADER_HEIGHT, unit);
  }

  onMouseClick({x, y}: {x: number, y: number}): boolean {
    const expandedCallsite = this.flamegraph.onMouseClick({x, y});
    globals.dispatch(Actions.expandHeapProfileFlamegraph({expandedCallsite}));
    return true;
  }

  onMouseMove({x, y}: {x: number, y: number}): boolean {
    this.flamegraph.onMouseMove({x, y});
    return true;
  }

  onMouseOut() {
    this.flamegraph.onMouseOut();
  }
}
