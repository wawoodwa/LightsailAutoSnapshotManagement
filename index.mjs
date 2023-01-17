// Script to manage snapshots of Lightsail instances and relational databases

import { LightsailClient, GetInstancesCommand, GetRelationalDatabasesCommand, 
    CreateInstanceSnapshotCommand, CreateRelationalDatabaseSnapshotCommand, 
    GetInstanceSnapshotsCommand, GetRelationalDatabaseSnapshotsCommand, 
    DeleteInstanceSnapshotCommand, DeleteRelationalDatabaseSnapshotCommand } 
    from "@aws-sdk/client-lightsail";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export const handler = async(event) => {
////////////////////////////////////////////////////////////////////////
    // Set the region
    const REGION = process.env.REGION || 'us-east-2';

    // Set the Snapshot Identifier
    const AUTO_SNAPSHOT_IDENT = process.env.AUTO_SNAPSHOT_IDENT || 'lambda';
    
    // Set the retention count
    const RETENTION_DAYS = process.env.RETENTION_DAYS || 30;

    // Set the sender, recipient, and subject
    const EMAIL_FROM = process.env.EMAIL_FROM || 'lightsail@contoso.com';
    const EMAIL_TO = process.env.EMAIL_TO || 'monitor@contoso.com';
    const EMAIL_SUBJECT = process.env.EMAIL_SUBJECT || 'Lightsail Snapshot Status';

    // Create a Lightsail client
    const lightsail = new LightsailClient({ region: `${REGION}` });

    // Create a Simple Email Service (SES) object
    const ses = new SESv2Client({ region: `${REGION}` });

    // Create email body
    let emailBody = "";
 
////////////////////////////////////////////////////////////////////////
    const createInstanceSnapshots = async () => {
        // Define variables for AWS-SDK
        let params = {};
        let command;
        let instances;

        // Create a snapshot for each instance
        // Need to loop through to make sure to get all instances via pagination
        do {
            // Get all instances
            command = new GetInstancesCommand(params);
            instances = await lightsail.send(command);

            // Create a snapshot for each instance        
            for (let i = 0; i < instances.instances.length; i++) {
                const instanceName = instances.instances[i].name;
                const timestamp = Math.floor(Date.now() / 1000);
                const snapshotName = `${instanceName}-${timestamp}-${AUTO_SNAPSHOT_IDENT}`;
        
                params = { instanceName: instanceName, 
                    instanceSnapshotName: snapshotName
                };
                command = new CreateInstanceSnapshotCommand(params);
                let result = await lightsail.send(command);
                console.log(result);
                console.log(`Created: Instance Snapshot ${snapshotName} for ${instanceName}.`);
                emailBody += `Created: Instance Snapshot ${snapshotName}  for ${instanceName}.\n`;
            }

            params = { pageToken: instances.nextPageToken };
        } while (instances.nextPageToken);
    };
    
    const createRelationalDatabaseSnapshots = async () => {
        // Define variables for AWS-SDK
        let params = {};
        let command;
        let databases;

        // Create snapshots for all relational databases
        // Need to loop through to make sure to get all databases via pagination
        do {
            // Get all relational databases
            command = new GetRelationalDatabasesCommand(params);
            databases = await lightsail.send(command);

            // Create a snapshot for each relational database
            for (let i = 0; i < databases.relationalDatabases.length; i++) {
                const databaseName = databases.relationalDatabases[i].name;
                const timestamp = Math.floor(Date.now() / 1000);
                const snapshotName = `${databaseName}-${timestamp}-${AUTO_SNAPSHOT_IDENT}`;

                params = { relationalDatabaseName: databaseName, 
                    relationalDatabaseSnapshotName: snapshotName
                };
                command = new CreateRelationalDatabaseSnapshotCommand(params);
                let result = await lightsail.send(command);
                console.log(result);
                console.log(`Created: Relational Database Snapshot ${snapshotName} for ${databaseName}.`);
                emailBody += `Created: Relational Database Snapshot ${snapshotName} for ${databaseName}.\n`;
            }
            
            params = { pageToken: databases.nextPageToken };
        } while (databases.nextPageToken);
    };

    const deleteOldInstanceSnapshots = async () => {
        // Define variables for AWS-SDK
        let params = {};
        let command;
        let snapshots;
        
        // Get the current timestamp
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        // Delete snapshots that are older than the retention days and have the AUTO_SNAPSHOT_IDENT in the name
        // Need to loop through to make sure to get all snapshots via pagination
        do {
            // Get all instance snapshots
            command = new GetInstanceSnapshotsCommand(params);
            snapshots = await lightsail.send(command);
            
            for (let i = 0; i < snapshots.instanceSnapshots.length; i++) {
                const snapshotName = snapshots.instanceSnapshots[i].name;
                const snapshotTimestamp = snapshots.instanceSnapshots[i].createdAt.getTime() / 1000;

                // Check that the name includes the identifier we use or auto, as auto was
                // used by the old Py2.7 routine. Check that snapshot is older than
                // the required retention
                if ((snapshotName.includes(AUTO_SNAPSHOT_IDENT) ||
                    snapshotName.includes('auto')) && 
                    currentTimestamp - snapshotTimestamp > RETENTION_DAYS * 24 * 60 * 60) {
                
                    params = { instanceSnapshotName: snapshotName };
                    command = new DeleteInstanceSnapshotCommand(params);
                    let result = await lightsail.send(command);
                    console.log(result);
                    console.log(`Deleted: Instance Snapshot ${snapshotName} as it was older than ${RETENTION_DAYS} days.`);
                    emailBody += `Deleted: Instance Snapshot ${snapshotName} as it was older than ${RETENTION_DAYS} days.\n`;
                }
            }
            
            params = { pageToken: snapshots.nextPageToken };
        } while (snapshots.nextPageToken); 
    };
    
    const deleteOldRelationalDatabaseSnapshots = async () => {
        // Define variables for AWS-SDK
        let params = {};
        let command;
        let snapshots;

        // Get the current timestamp
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        // Delete snapshots that are older than the retention days and have the AUTO_SNAPSHOT_IDENT in the name
        // Need to loop through to make sure to get all snapshots via pagination
        do {
            // Get all relational database snapshots
            command = new GetRelationalDatabaseSnapshotsCommand(params);
            snapshots = await lightsail.send(command);

            for (let i = 0; i < snapshots.relationalDatabaseSnapshots.length; i++) {
                const snapshotName = snapshots.relationalDatabaseSnapshots[i].name;
                const snapshotTimestamp = snapshots.relationalDatabaseSnapshots[i].createdAt.getTime() / 1000;

                // Check that the name includes the identifier we use or auto, as auto was
                // used by the old Py2.7 routine. Check that snapshot is older than
                // the required retention
                if ((snapshotName.includes(AUTO_SNAPSHOT_IDENT) ||
                    snapshotName.includes('auto')) && 
                    currentTimestamp - snapshotTimestamp > RETENTION_DAYS * 24 * 60 * 60) {
            
                params = { relationalDatabaseSnapshotName: snapshotName };
                command = new DeleteRelationalDatabaseSnapshotCommand(params);
                let result = await lightsail.send(command);
                console.log(result);
                console.log(`Deleted: Relational Database Snapshot ${snapshotName} as it was older than ${RETENTION_DAYS} days.`);
                emailBody += `Deleted: Relational Database Snapshot ${snapshotName} as it was older than ${RETENTION_DAYS} days.\n`;
                }
            }
            
            params = { pageToken: snapshots.nextPageToken };
        } while(snapshots.nextPageToken);
    };

    const sendStatusEmail = async () => {
        // Create the parameters for the SendEmailCommand
        const params = {
            Destination: {
                ToAddresses: [
                    EMAIL_TO
                ]
            },
            Content: {
                Simple: {
                    Body: {
                        Text: {
                            Charset: "UTF-8",
                            Data: emailBody
                        }
                    },
                    Subject: {
                        Charset: "UTF-8",
                        Data: EMAIL_SUBJECT
                    }
                }
            },
            FromEmailAddress: EMAIL_FROM
        };

        // Create the SendEmailCommand
        const command = new SendEmailCommand(params);

        // Send the email
        await ses.send(command);
        console.log(`Email sent to ${EMAIL_TO} with subject "${EMAIL_SUBJECT}"`);
    };


////////////////////////////////////////////////////////////////////////
    //Main Thread
    
    await createInstanceSnapshots();
    await createRelationalDatabaseSnapshots();
    await deleteOldInstanceSnapshots();
    await deleteOldRelationalDatabaseSnapshots();
    await sendStatusEmail();
    
    const response = {
        statusCode: 200,
        body: JSON.stringify(emailBody),
    };
    
    return response;
};
