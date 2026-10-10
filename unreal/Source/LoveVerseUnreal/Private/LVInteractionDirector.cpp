#include "LVInteractionDirector.h"

#include "LVAvatarCharacter.h"

ALVInteractionDirector::ALVInteractionDirector()
{
    PrimaryActorTick.bCanEverTick = false;
}

void ALVInteractionDirector::BeginPlay()
{
    Super::BeginPlay();
}

void ALVInteractionDirector::PlayCoupleInteraction(ELVCoupleInteraction Interaction)
{
    MoveAvatarsForInteraction(Interaction);

    if (UserAvatar)
    {
        UserAvatar->PlayInteractionPose(Interaction, false);
    }
    if (PartnerAvatar)
    {
        PartnerAvatar->PlayInteractionPose(Interaction, true);
    }
}

void ALVInteractionDirector::ResetToIdle()
{
    PlayCoupleInteraction(ELVCoupleInteraction::Idle);
}

void ALVInteractionDirector::MoveAvatarsForInteraction(ELVCoupleInteraction Interaction)
{
    if (!UserAvatar || !PartnerAvatar)
    {
        return;
    }

    FVector UserLocation(-70, -45, 0);
    FVector PartnerLocation(70, 45, 0);

    switch (Interaction)
    {
    case ELVCoupleInteraction::Hug:
    case ELVCoupleInteraction::Kiss:
    case ELVCoupleInteraction::Cuddle:
    case ELVCoupleInteraction::ForeheadKiss:
        UserLocation = FVector(-18, -12, 0);
        PartnerLocation = FVector(18, 12, 0);
        break;
    case ELVCoupleInteraction::HoldHands:
    case ELVCoupleInteraction::Dance:
        UserLocation = FVector(-55, -18, 0);
        PartnerLocation = FVector(55, 18, 0);
        break;
    case ELVCoupleInteraction::SitTogether:
        UserLocation = FVector(-38, -120, 45);
        PartnerLocation = FVector(38, -120, 45);
        break;
    case ELVCoupleInteraction::SleepBeside:
        UserLocation = FVector(-42, 105, 35);
        PartnerLocation = FVector(42, 105, 35);
        break;
    default:
        break;
    }

    UserAvatar->SetActorLocation(UserLocation);
    PartnerAvatar->SetActorLocation(PartnerLocation);
    UserAvatar->SetLookAtTarget(PartnerAvatar->GetActorLocation());
    PartnerAvatar->SetLookAtTarget(UserAvatar->GetActorLocation());
}
