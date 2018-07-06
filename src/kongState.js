import semVer from 'semver';
import {getSupportedCredentials} from './consumerCredentials'

var sleep = require('sleep');

const fetchUpstreamsWithTargets = async ({ version, fetchUpstreams, fetchTargets }) => {
    if (semVer.lte(version, '0.10.0')) {
        return Promise.resolve([]);
    }

    const upstreams = await fetchUpstreams();

    return await Promise.all(
        upstreams.map(async item => {
            const targets = await fetchTargets(item.id);

            return { ...item, targets };
        })
    );
};

const fetchCertificatesForVersion = async ({ version, fetchCertificates }) => {
    if (semVer.lte(version, '0.10.0')) {
        return Promise.resolve([]);
    }

    return await fetchCertificates();
};

export default async ({fetchApis, fetchPlugins, fetchGlobalPlugins, fetchConsumers, fetchConsumerCredentials, fetchConsumerAcls, fetchUpstreams, fetchTargets, fetchTargetsV11Active, fetchCertificates, fetchKongVersion}) => {
    sleep.msleep(100);
    const version = await fetchKongVersion();
    sleep.msleep(100);
    const apis = await fetchApis();
    sleep.msleep(100);
    const apisWithPlugins = await Promise.all(apis.map(async item => {
        sleep.msleep(200);
        const plugins =  await fetchPlugins(item.id);

        return {...item, plugins};
    }));
    sleep.msleep(100);
    const consumers = await fetchConsumers();
    const consumersWithCredentialsAndAcls = await Promise.all(consumers.map(async consumer => {
        if (consumer.custom_id && !consumer.username) {
            console.log(`Consumers with only custom_id not supported: ${consumer.custom_id}`);

            return consumer;
        }

        const allCredentials = Promise.all(getSupportedCredentials().map(name => {
            sleep.msleep(100);
            return fetchConsumerCredentials(consumer.id, name)
                .then(credentials => [name, credentials]);
        }));

        sleep.msleep(100);
        var aclsFetched = await fetchConsumerAcls(consumer.id);

        var consumerWithCredentials = allCredentials
            .then(result => {
                return {
                    ...consumer,
                    credentials: result.reduce((acc, [name, credentials]) => {
                        return {...acc, [name]: credentials};
                    }, {}),
                    acls: aclsFetched

                };
            });

        return consumerWithCredentials;

    }));

    sleep.msleep(100);
    const allPlugins = await fetchGlobalPlugins();
    const globalPlugins = allPlugins.filter(plugin => {
        return plugin.api_id === undefined;
    });

    sleep.msleep(100);
    const upstreamsWithTargets = await fetchUpstreamsWithTargets({ version, fetchUpstreams, fetchTargets: semVer.gte(version, '0.12.0') ? fetchTargets : fetchTargetsV11Active });
    sleep.msleep(100);
    const certificates = await fetchCertificatesForVersion({ version, fetchCertificates });

    return {
        apis: apisWithPlugins,
        consumers: consumersWithCredentialsAndAcls,
        plugins: globalPlugins,
        upstreams: upstreamsWithTargets,
        certificates,
        version,
    };
};
