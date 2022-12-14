const { User, Thought } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers ={
    Query:{
        me: async (parents, args, context) =>{
            if(context.user){
                const userData = await User.findOne({_id:context.user._id})
                .select('-_v -password')
                .populate('thoughts')
                .populate('friends');
            
                return userData;
            }

            throw new AuthenticationError('Not logged in');
        },
        //find all
        thoughts: async (parent, { username }) => {
            const params = username ? { username }:{};
            
            return Thought.find().sort({createdAt:-1});
        },
        //find one, singular
        thought: async(parent, {_id}) =>{
            return Thought.findOne({_id});
        },
        //find all
        users:async() =>{
            return User.find()
                .select('-_v -password')
                .populate('friends')
                .populate('thoughts');
        },
        //find one, singular
        user: async(parent, { username }) =>{
            return User.findOne({ username })
                .select('-_v -password')
                .populate('friends')
                .populate('thoughts');
        },
    },
    Mutation:{
        addUser:async(parent, args) =>{
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user};
        },
        login: async(parent, { email, password }) =>{
            const user = await User.findOne({email});
            if(!user){
                throw new AuthenticationError('Incorrect credentials');
            }

            const correctPw = await user.isCorrectPassword(password);


            if(!correctPw){
                throw new AuthenticationError('Incorrect credentials');
            }

            const token = signToken(user);
            return { token, user };
        },
        addThought: async(parent, args, context) =>{
            if(context.user){
                const thought = await Thought.create({...args, username:context.user.username});

                await User.findByIdAndUpdate(
                    {_id:context.user._id},
                    {$push: { thoughts: thought._id}},
                    {new:true}
                );
                return thought;
            }
            throw new AuthenticationError('You need to be logged in!');
        },
        addReaction:async(parent, { thoughtId, reactionBody }, context) =>{
            if(context.user){
                const updatedThought = await Thought.findOneAndUpdate(
                    {_id:thoughtId},
                    {$push:{reactions: { reactionBody, username:context.user.username}}},
                    {new:true, runvalidators:true}
                );
                return updatedThought;
            }

            throw new AuthenticationError('You need to be logged in!');
        },
        addFriend: async(parent, { friendId}, context) =>{
            if(context.user){
                const updateUser = await User.findOneAndUpdate(
                    {_id: context.user._id},
                    {$addToSet:{ friends:friendId }},
                    {new: true}
                ).populate('friends');
                
                return updateUser;
            }

            throw new AuthenticationError('You need to be logged in!');
        }
    }
};

module.exports = resolvers;