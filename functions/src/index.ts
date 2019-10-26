// tslint:disable-next-line: no-implicit-dependencies
import { DocumentData, DocumentReference } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as nodemailer from 'nodemailer';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//     response.send('Hello from Firebase!');
// });

admin.initializeApp();
const recievingEmail = 'archil.karchawa@yandex.ru';
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

// const APP_NAME = 'Furnitur';

interface IProduct {
    category: {
        image: string,
        name: string,
        namePlural: string
    },
    // category: DocumentSnapshot
    description?: string,
    image?: string,
    name: string,
    oldPrice?: number,
    price: number
}
interface IFirebaseRawProduct {
    category: DocumentReference | DocumentData | undefined
    description?: string,
    image?: string,
    name: string,
    oldPrice?: number,
    price: number
}

interface IOrder {
    user: { firstName: string, lastName: string, phoneNumber: string }, items: Array<{ item: IProduct, quantity: number }>, sum: number
}
interface IFirebaseRawOrder {
    user: { firstName: string, lastName: string, phoneNumber: string }, items: [{ item: DocumentReference, quantity: number }], sum: number
}

const sendEmail = async (order: IOrder) => {
    const user = order.user;
    const items = order.items;
    const mailOptions = {
        from: `${functions.config().gmail.email}`,
        to: recievingEmail,
        subject: 'Furnitur новый заказ',
        text: `Пользователь ${user.firstName} ${user.lastName} ${user.phoneNumber} хочет сделать заказ на сумму ${order.sum}
        Товары: ${items.map(({ item, quantity }) => `${item.category.name} ${item.name} - ${item.price} в количестве ${quantity} шт.\n`)}`
    };
    try {
        await mailTransport.sendMail(mailOptions);
        console.log('Информация о заказе отправлена на:', recievingEmail);
    } catch (e) {
        console.error(`Ошибка отправки с ${gmailEmail} на ${recievingEmail}: ${e}`)
    }
    return null;
}

// const asyncForEach = async (array: Array<any>, callback: any) => {
//     for (let index = 0; index < array.length; index++) {
//         await callback(array[index], index, array)
//     }
// }

export const sendEmailWithNewOrder = functions.firestore.document('orders/{orderId}').onWrite((change, context) => {
    const newOrder: IFirebaseRawOrder | undefined = change.after.exists ? change.after.data() as IFirebaseRawOrder : undefined;
    if (!newOrder) {
        console.error("Error: couldn't retrieve data from database");
        return null;
    }
    console.log(JSON.stringify(newOrder, null, 4));
    // newOrder.items.forEach(async (item: any) => {
    //     item.item = await item.item.get();
    //     console.log(JSON.stringify(item.item, null, 4));
    //     item.item.category = await item.item.category.get();
    //     console.log(JSON.stringify(item.item.category, null, 4));
    // });
    // tslint:disable-next-line: no-floating-promises
    // const resultOrder = newOrder.items.map(async (item: any) => {
    //     item.item = await item.item.get();
    //     item.item.category = await item.item.category.get();
    // })
    const items: Array<{ item: IProduct, quantity: number }> = []
    newOrder.items.forEach(async (itemData) => {
        await itemData.item.get().then(async snap => {
            const curItem: { item: IFirebaseRawProduct, quantity: number } = { item: snap.data() as IFirebaseRawProduct, quantity: itemData.quantity };

            // console.log('itemData.item: ', itemData.item)
            await curItem.item.category!.get().then(snap2 => {
                curItem.item.category = snap2.data();
                // console.log('curItem.item.category: ', curItem.item.category)
                items.push(curItem as { item: IProduct, quantity: number });
                // console.log(curItem);
            })
        })
    })
    const orderData = {
        ...newOrder,
        items: items
    }
    console.log('orderData: ', JSON.stringify(orderData, null, 4));
    return sendEmail(orderData)
});
