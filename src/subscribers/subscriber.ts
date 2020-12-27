export interface Subscriber {
    /**
     * Subscribe to incoming events.
     *
     * @param  {Function}  callback
     * @return {Promise<void>}
     */
    subscribe(callback: Function): Promise<void>;

    /**
     * Unsubscribe from incoming events
     *
     * @return {Promise<void>}
     */
    unsubscribe(): Promise<void>;
}
