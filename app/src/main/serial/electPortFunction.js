const Connector = require('./connector');
const { compact } = require('lodash');

/**
 * @param ports {string[]}
 * @param hwConfig {Object}
 * @param hwModule {Object}
 * @param beforeConnectCallback {Function=}
 */
const electPort = async (ports, hwConfig, hwModule, beforeConnectCallback) => {
    // 선출 후보 포트 모두 오픈
    const connectors = await _initialize(ports, hwConfig, hwModule);

    if (!connectors || connectors.length === 0) {
        return;
    }

    if (beforeConnectCallback) {
        beforeConnectCallback(connectors[0]);
    }

    // 전부 checkInitialData 로직 수행
    const electedConnector = await Promise.race(
        connectors.map(async (connectorObject) => {
            const { connector } = connectorObject;
            await connector.initialize();
            return connectorObject;
        }),
    );

    // 선출되지 못한 포트들 전부 다시 닫기
    _finalize(connectors.filter(({ port }) => port !== electedConnector.port));

    return electedConnector;
};

/**
 * 선출후보인 모든 포트를 전부 커넥터 오픈한다.
 * 결과는 this.connectors 에 저장한다
 * @private
 */
const _initialize = async (ports, hwConfig, hwModule) => {
    const portList = await Promise.all(ports.map(async (port) => {
        try {
            const connector = new Connector(hwModule, hwConfig);
            await connector.open(port);
            return { port, connector };
        } catch (e) {
            console.log(`port ${port} elect initilize error`, e);
            return undefined;
        }
    }));

    return compact(portList);
};

const _finalize = async (connectors) => {
    connectors.forEach(({ connector }) => {
        connector.close();
    });
};

module.exports = electPort;
module.exports.electPort = electPort;