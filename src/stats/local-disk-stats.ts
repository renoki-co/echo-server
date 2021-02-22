import { App } from './../app';
import { LocalStats } from './local-stats';
import { StorageManager, Storage } from '@slynova/flydrive';

const dayjs = require('dayjs');

export class LocalDiskStats extends LocalStats {
    /**
     * The Storage instance.
     *
     * @type {Storage}
     */
    protected disk: Storage;

    /**
     * Initialize the local stats driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        super(options);

        this.disk = (new StorageManager({
            default: 'local',
            disks: {
                local: {
                    driver: 'local',
                    config: options.stats['local-disk'],
                },
            }
        })).disk();
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<any>}
     */
    takeSnapshot(app: App|string, time?: number): Promise<any> {
        let appKey = app instanceof App ? app.key : app;
        let file = `${appKey}.json`;

        return super.takeSnapshot(app, time).then(record => {
            // Make sure it doesn't get stored in the memory.
            this.snapshots[appKey] = [];

            return this.disk.exists(file).then(existsResponse => {
                if (!existsResponse.exists) {
                    return this.disk.put(file, JSON.stringify([record]));
                } else {
                    return this.disk.get(file, 'utf-8').then(readFile => {
                        let content = JSON.parse(readFile.content) || [];

                        content.push(record);

                        return this.disk.put(file, JSON.stringify(content));
                    });
                }
            }).then(() => record);
        });
    }

    /**
     * Get the list of stats snapshots
     * for a given interval.
     * Defaults to the last 7 days.
     *
     * @param  {App|string}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<any>}
     */
    getSnapshots(app: App|string, start?: number, end?: number): Promise<any> {
        let appKey = app instanceof App ? app.key : app;
        let file = `${appKey}.json`;

        start = start ? start : dayjs().subtract(7, 'day').unix();
        end = end ? end : dayjs().unix();

        return this.disk.exists(file).then(existsResponse => {
            if (existsResponse.exists) {
                return this.disk.get(file, 'utf-8').then(readFile => {
                    return JSON.parse(readFile.content).filter(point => {
                        return start <= point.time && point.time <= end;
                    });
                });
            } else {
                return this.disk.put(file, JSON.stringify([])).then(() => []);
            }
        });
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<boolean>}
     */
    deleteStalePoints(app: App|string, time?: number): Promise<boolean> {
        let appKey = app instanceof App ? app.key : app;
        let file = `${appKey}.json`;

        return this.getSnapshots(app, 0, Infinity).then(snapshots => {
            let filteredSnapshots = snapshots.filter(point => {
                return point.time >= (time - this.options.stats.retention.period);
            });

            return this.disk.put(file, JSON.stringify(filteredSnapshots)).then(() => filteredSnapshots);
        }).then(() => true);
    }
}
