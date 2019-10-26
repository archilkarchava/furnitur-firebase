// tslint:disable-next-line: no-implicit-dependencies
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
    id: string,
    description?: string,
    image?: string,
    name: string,
    oldPrice?: number,
    price: number
}

interface IOrder {
    customer: { firstName: string, lastName: string, phoneNumber: string }, items: Array<{ item: IProduct, quantity: number }>, sum: number
}

const sendEmail = async (order: IOrder) => {
    const customer = order.customer;
    const items = order.items;
    const mailOptions = {
        from: `${functions.config().gmail.email}`,
        to: recievingEmail,
        subject: 'Furnitur новый заказ',
        text: `
Пользователь ${customer.firstName} ${customer.lastName} ${customer.phoneNumber} хочет сделать заказ на сумму ${order.sum} рублей.
Товары: 
${items.map(({ item, quantity }) => `   ${item.category.name} ${item.name} - ${item.price} руб. в количестве ${quantity} шт.,`).join('\n')}`
    };
    try {
        await mailTransport.sendMail(mailOptions);
        console.log('Информация о заказе отправлена на:', recievingEmail);
    } catch (e) {
        console.error(`Ошибка отправки с ${gmailEmail} на ${recievingEmail}: ${e}`)
    }
    return null;
}

export const sendEmailWithNewOrder = functions.firestore.document('orders/{orderId}').onCreate((snap, context) => {
    const newOrder = snap.exists ? snap.data() : undefined;
    if (!newOrder) {
        console.error("Error: couldn't retrieve data from database");
        return null;
    }
    console.log(JSON.stringify(newOrder, null, 4));
    return sendEmail(newOrder as IOrder)
});
