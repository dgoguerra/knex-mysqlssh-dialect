describe('Testing that all exports are available', () => {
    const mysqlssh = require('../mysqlssh/tunnel-management');
    test('it should confirm our functions are exported', () => {
        expect(mysqlssh.verifyConfiguration).toBeDefined();
        expect(mysqlssh._getPrivateKey).toBeDefined();
        expect(mysqlssh._establishTunnel).toBeDefined();
        expect(mysqlssh._destroyTunnel).toBeDefined();
        expect(mysqlssh.incrementConnections).toBeDefined();
        expect(mysqlssh.decrementConnections).toBeDefined();
        expect(mysqlssh.getNumberOfConnections).toBeDefined();
    });
});

describe('Testing that we can verify a configuration', () => {
    const mysqlssh = require('../mysqlssh/tunnel-management');
    const aConfig = require('./sample-config-keyStr');
    const badConfig = require('./sample-config-bad');
    test('it should confirm we can verify a configuration', () => {
        expect(mysqlssh.verifyConfiguration(aConfig.connection)).toBeTruthy();
    });
    test('it should confirm we can fail a configuration', () => {
        expect(mysqlssh.verifyConfiguration(badConfig.connection)).toBeFalsy();
    });
});

describe('Testing that we can process private keys', () => {
    const mysqlssh = require('../mysqlssh/tunnel-management');
    const withKeyFromFile = require('./sample-config-keyFile');
    const fs = require('fs');
    const path = require('path');
    const keyFilePath = path.resolve(withKeyFromFile.connection.tunnelConfig.jmp.auth.keyFile);
    const keyText = fs.readFileSync(keyFilePath, { encoding: 'utf8' });
    const trimmedKeyText = keyText.trim();
    test('it should confirm we can read a private key from a file', () => {
        expect(mysqlssh._getPrivateKey(withKeyFromFile.connection) === trimmedKeyText).toBeTruthy();
    });
    const withKeyFromStr = require('./sample-config-keyStr');
    withKeyFromStr.connection.tunnelConfig.jmp.auth.keyStr = trimmedKeyText;
    test('it should confirm we can process a private key as a string', () => {
        expect(mysqlssh._getPrivateKey(withKeyFromStr.connection) === trimmedKeyText).toBeTruthy();
    });
});

describe('Testing how we build up & tear down the tunnel', () => {
    const mysqlssh = require('../mysqlssh/tunnel-management');
    test('it should start with zero connections open', () => {
        expect(mysqlssh.getNumberOfConnections()).toBe(0)
    });
    const serverRefCloses = {
        close: () => { }
    };
    test('it should close a successful tunnel', async () => {
        await expect(mysqlssh._destroyTunnel(serverRefCloses));
    });
    const tnlConfig = require('./sample-cfg-tnl');
    const tunnelWillFail = function (cfg, callBackFn) {
        callBackFn('internal error', {});
    };
    test('it should handle a failed tunnel', async () => {
        await expect(mysqlssh._establishTunnel(tnlConfig.connection, tunnelWillFail))
            .rejects.toEqual(Error('internal error'));
    });
    const tunnelWillPass = function (cfg, callBackFn) {
        callBackFn('', {});
    };
    test('it should handle a successful tunnel', async () => {
        await expect(mysqlssh._establishTunnel(tnlConfig.connection, tunnelWillPass));
    });
    const badConfig = require('./sample-config-bad');
    test('it should fail to establish with a bad config', async () => {
        await expect(mysqlssh._establishTunnel(badConfig.connection, tunnelWillPass))
            .rejects.toThrow('invalid configuration supplied to _establishTunnel()');
    });
    test('it should fail to increment with a bad config', async () => {
        await expect(mysqlssh.incrementConnections(badConfig.connection))
            .rejects.toThrow('invalid configuration supplied to incrementConnections()');
    });
    const goodConfig = require('./sample-config-keyStr');
    test('it should only establishConnection once', async () => {
        mysqlssh._establishTunnel = jest.fn().mockResolvedValue(0);
        const establishTunnelSpy = jest.spyOn(mysqlssh, '_establishTunnel');
        await mysqlssh.incrementConnections(goodConfig.connection);
        await mysqlssh.incrementConnections(goodConfig.connection);
        await mysqlssh.incrementConnections(goodConfig.connection);
        expect(establishTunnelSpy.mock.calls.length).toBe(1);
    });
    test('it should have opened 3 connections', () => {
        expect(mysqlssh.getNumberOfConnections()).toBe(3)
    });
    test('it should only destroyConnection once', async () => {
        mysqlssh._destroyTunnel = jest.fn().mockResolvedValue(0);
        const destroyTunnelSpy = jest.spyOn(mysqlssh, '_destroyTunnel');
        await mysqlssh.decrementConnections(goodConfig.connection);
        await mysqlssh.decrementConnections(goodConfig.connection);
        await mysqlssh.decrementConnections(goodConfig.connection);
        await mysqlssh.decrementConnections(goodConfig.connection);
        expect(destroyTunnelSpy.mock.calls.length).toBe(1);
    });
    test('it should have zero connections open', () => {
        expect(mysqlssh.getNumberOfConnections()).toBe(0)
    });
});

